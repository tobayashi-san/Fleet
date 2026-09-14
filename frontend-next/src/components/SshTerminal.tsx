import { terminalDisconnectMessage } from '@/lib/terminal-disconnect';
import { searchTerminalBuffer } from "@/lib/terminal-search";
import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Copy, Keyboard, Trash2, X, Maximize2, Minimize2 } from 'lucide-react';
import { getToken } from '@/lib/auth';
import { useUi } from '@/lib/store';
import { cn } from '@/lib/utils';

function terminalTheme(isDark: boolean) { return isDark ? {
          background: '#0d1117', foreground: '#c9d1d9', cursor: '#58a6ff', selectionBackground: 'rgba(88,166,255,0.25)',
          black: '#484f58', brightBlack: '#6e7681', red: '#ff7b72', brightRed: '#ffa198', green: '#3fb950', brightGreen: '#56d364',
          yellow: '#d29922', brightYellow: '#e3b341', blue: '#58a6ff', brightBlue: '#79c0ff', magenta: '#bc8cff', brightMagenta: '#d2a8ff',
          cyan: '#39c5cf', brightCyan: '#56d4dd', white: '#b1bac4', brightWhite: '#f0f6fc',
        } : {
          background: '#ffffff', foreground: '#172b4d', cursor: '#0f6cbd', selectionBackground: 'rgba(15,108,189,0.18)',
          black: '#172b4d', brightBlack: '#5e6c84', red: '#c9372c', brightRed: '#e34935', green: '#216e4e', brightGreen: '#2a8b65',
          yellow: '#8f6b00', brightYellow: '#a87b00', blue: '#0c66e4', brightBlue: '#0055cc', magenta: '#803fa5', brightMagenta: '#9747ff',
          cyan: '#006b75', brightCyan: '#007f89', white: '#dfe1e6', brightWhite: '#ffffff',
        }; }

interface SshTerminalProps {
  server: Record<string, unknown>;
  onClose: () => void;
}

/**
 * Full-screen overlay that opens an xterm.js SSH session via WebSocket.
 * xterm + fit addon are lazily imported so they stay in the `terminal` chunk.
 */
export function SshTerminal({ server, onClose }: SshTerminalProps) {
  const { t } = useTranslation();
  const serverId = String(server.id);
  const sshUser = (server.ssh_user as string) || 'root';
  const theme = useUi((state) => state.theme);
  const environmentId = useUi((state) => state.environmentId);
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [disconnectMessage, setDisconnectMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const searchCursor = useRef<{query:string;row:number;column:number}|null>(null);
  const [sessionAudit, setSessionAudit] = useState(false);
  const [limits, setLimits] = useState<{idleSeconds:number;maxSeconds:number}|null>(null);
  const [session, setSession] = useState<{started:number|null;ended:number|null}>({started:null,ended:null});
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!session.started || session.ended) return;
    const timer = window.setInterval(() => setNow(Date.now()),1000);
    return () => window.clearInterval(timer);
  }, [session.started,session.ended]);
  const elapsed = session.started ? Math.max(0,Math.floor(((session.ended || now)-session.started)/1000)) : 0;
  const duration = `${Math.floor(elapsed/3600).toString().padStart(2,'0')}:${Math.floor(elapsed/60%60).toString().padStart(2,'0')}:${(elapsed%60).toString().padStart(2,'0')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const termRef = useRef<import('@xterm/xterm').Terminal | null>(null);
  const onCloseRef = useRef(onClose);
  const terminalThemeRef = useRef(terminalTheme(isDark));
  useEffect(() => {
    terminalThemeRef.current = terminalTheme(isDark);
    if (termRef.current) termRef.current.options.theme = terminalThemeRef.current;
  }, [isDark]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const closeTerminal = useCallback(() => {
    wsRef.current?.close();
    onCloseRef.current();
  }, []);

  const setStatus = useCallback((state: 'connecting' | 'online' | 'offline', text: string) => {
    setConnected(state === 'online');
    if (termRef.current) { termRef.current.options.disableStdin = state !== 'online'; termRef.current.options.cursorBlink = state === 'online'; }
    if (state === 'connecting') { setDisconnectMessage(''); setSession({started:null,ended:null}); setSessionAudit(false); setLimits(null); }
    if (state === 'online') { const started=Date.now(); setNow(started); setSession({started,ended:null}); }
    if (state === 'offline') setSession(previous=>({...previous,ended:previous.ended || Date.now()}));
    if (dotRef.current) {
      dotRef.current.className = cn(
        'inline-block h-2 w-2 rounded-full',
        state === 'online' ? 'bg-green-500' : state === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
      );
    }
    if (statusRef.current) statusRef.current.textContent = text;
  }, []);

  useEffect(() => {
    let disposed = false;
    let resizeObs: ResizeObserver | null = null;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ]);
      // xterm CSS is loaded via the side-effect import below
      await import('@xterm/xterm/css/xterm.css' as string);

      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: '"JetBrains Mono","Fira Code","Cascadia Code",monospace',
        scrollback: 5000,
        theme: terminalThemeRef.current,
      });
      termRef.current = term;

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);

      // Double rAF for correct measurement
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (disposed) return;
        fitAddon.fit();
        term.focus();

        // Connect WebSocket
        const { cols, rows } = term;
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const token = getToken();
        const wsUrl = `${protocol}//${location.host}/ws/ssh`
          + `?serverId=${encodeURIComponent(serverId)}`
          + `&environment=${encodeURIComponent(environmentId)}&output=json-v1`
          + `&cols=${cols}&rows=${rows}`
          + (token ? `&token=${encodeURIComponent(token)}` : '');

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        let ready = false;
        let closureDetail = '';
        const describeClosure = (message: string) => { closureDetail = message; setDisconnectMessage(message); };

        ws.onopen = () => {
          setStatus('connecting', t('term.connecting'));
        };

        ws.onmessage = (e) => {
          if (typeof e.data === 'string' && e.data.charCodeAt(0) === 123) {
            try {
              const msg = JSON.parse(e.data);
              if (msg?.type === 'output' && typeof msg.data === 'string') {
                term.write(msg.data);
                return;
              }
              if (msg.type === 'ready') {
                ready = true;
                setSessionAudit(msg.sessionAudit === true);
                if (Number.isFinite(msg.limits?.idleSeconds) && Number.isFinite(msg.limits?.maxSeconds)) setLimits(msg.limits);
                const userLabel = sshUser;
                setStatus('online', t('term.connectedAs', { user: userLabel }));
              } else if (msg.type === 'error') {
                describeClosure(typeof msg.message === 'string' ? msg.message : 'The SSH server reported an error.');
                setStatus('offline', t('term.error'));
                term.write(`\r\n\x1b[31m${t('term.error')}: ${msg.message}\x1b[0m\r\n`);
              } else if (msg.type === 'closed') {
                setStatus('offline', t('term.disconnected'));
                const reason = msg.reason === 'idle_timeout' ? 'Closed after the configured period without terminal input.' : msg.reason === 'duration_limit' ? 'Maximum terminal session duration reached.' : t('term.connClosed');
                describeClosure(reason);
                term.write(`\r\n\x1b[33m${reason}\x1b[0m\r\n`);
              }
              if (msg?.type === 'ready' || msg?.type === 'error' || msg?.type === 'closed') return;
            } catch { /* fall through to raw output */ }
          }
          term.write(e.data);
        };

        ws.onclose = (event) => {
          if (disposed) return;
          if ([4001,4003,4004].includes(event.code) || !closureDetail) {
            const message = terminalDisconnectMessage(event.code, ready);
            describeClosure(message);
            term.write(`\r\n\x1b[33m${message}\x1b[0m\r\n`);
          }
          setStatus('offline', ready ? t('term.disconnected') : t('term.connFailed'));
        };

        ws.onerror = () => {
          setStatus('offline', t('term.wsError'));
          // The close event supplies the final reason (including abnormal closure).
          term.write(`\r\n\x1b[31m${t('term.wsError')}\x1b[0m\r\n`);
        };

        term.onData((data) => {
          if (ready && !closureDetail && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'input', data }));
          }
        });

        // Resize observer
        resizeObs = new ResizeObserver(() => {
          fitAddon.fit();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
          }
        });
        resizeObs.observe(containerRef.current!);
      }));
    })();

    // Escape key handler
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeTerminal();
      }
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      disposed = true;
      document.removeEventListener('keydown', onKey, true);
      resizeObs?.disconnect();
      wsRef.current?.close();
      termRef.current?.dispose();
      // A Radix tab activates when it receives focus. Returning focus to the
      // terminal trigger would therefore reopen this dialog immediately.
      const focusTarget = previouslyFocused?.dataset.terminalTrigger === 'true'
        ? document.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
        : previouslyFocused;
      if (focusTarget && typeof focusTarget.focus === 'function') {
        try { focusTarget.focus(); } catch { /* ignore */ }
      }
    };
  }, [environmentId, closeTerminal, setStatus, serverId, sshUser, t]);

  const userLabel = sshUser;
  const serverName = (server.name as string) || '';
  const hostname = (server.hostname as string) || serverName;
  const ip = (server.ip_address as string) || '';
  const sendControlC = () => {
    const ws = wsRef.current;
    if (connected && ws?.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: 'input', data: '\x03' }));
    termRef.current?.focus();
  };
  const findInTerminal = (backwards = false) => {
    const term = termRef.current;
    if (!term || !search) return;
    const matches = searchTerminalBuffer(term.buffer.active, term.cols, search);
    if (!matches.length) { setSearchStatus('No matches in the current buffer.'); term.clearSelection(); searchCursor.current=null; return; }
    const previous = searchCursor.current;
    const current = previous?.query===search ? matches.findIndex(match=>match.row===previous.row && match.column===previous.column) : -1;
    const index = current < 0 ? backwards ? matches.length-1 : 0 : (current + (backwards ? -1 : 1) + matches.length)%matches.length;
    const match = matches[index];
    term.select(match.column,match.row,match.length);
    term.scrollToLine(match.row);
    searchCursor.current={query:search,row:match.row,column:match.column};
    setSearchStatus(`${index+1} of ${matches.length} matches`);
  };
  const clearTerminal = () => {
    searchCursor.current=null;setSearchStatus('');
    termRef.current?.clear();
    termRef.current?.write('\x1b[2J\x1b[H');
    termRef.current?.focus();
  };
  const copyLog = async () => {
    const term = termRef.current;
    if (!term) return;
    const selected = term.getSelection();
    const buffer = term.buffer.active;
    const output = selected || Array.from({ length: buffer.length }, (_, index) =>
      buffer.getLine(index)?.translateToString(true) || '',
    ).join('\n').replace(/\s+$/, '');
    try { await navigator.clipboard.writeText(output); setCopyStatus(selected ? 'Selection copied.' : 'Terminal buffer copied.'); }
    catch { setCopyStatus('Copy failed. Select terminal text and use your browser’s copy command.'); }
    term.focus();
  };

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[2000] flex items-start justify-center bg-black/55',expanded ? 'p-2' : 'p-4 pt-16')}
      onPointerDown={(e) => { if (e.target === e.currentTarget) closeTerminal(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('term.dialogLabel', { name: serverName || hostname || 'server' })}
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-panel border shadow-xl',
          expanded ? 'h-[calc(100dvh-1rem)] max-w-none' : 'h-[calc(100dvh-8rem)] max-h-[48rem] max-w-[1100px]',
          isDark ? 'border-[#30363d] bg-[#0d1117]' : 'border-border-strong bg-card'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between border-b px-4 py-2.5', isDark ? 'border-[#30363d]' : 'border-border bg-secondary/45')}>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span ref={dotRef} aria-hidden="true" className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
              <span className={cn('text-xs font-medium uppercase tracking-wider', isDark ? 'text-[#8b949e]' : 'text-muted-foreground')}>
                {t('common.terminal')}
              </span>
              <span className={cn('truncate font-semibold', isDark ? 'text-[#c9d1d9]' : 'text-foreground')}>{serverName}</span>
            </div>
            <div className={cn('truncate text-xs', isDark ? 'text-[#8b949e]' : 'text-muted-foreground')}>
              {userLabel}@{hostname} &middot; {ip}
            </div>
          </div>
          <div className="flex items-center gap-3" aria-live="polite">
            <span ref={statusRef} className={cn('text-xs', isDark ? 'text-[#8b949e]' : 'text-muted-foreground')}>{t('term.connecting')}</span>
            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                closeTerminal();
              }}
              onClick={closeTerminal}
              aria-label={t('common.close')}
              className={cn('inline-flex h-9 w-9 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', isDark ? 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}
              title={`${t('common.close')} (Esc)`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className={cn('flex flex-wrap items-center gap-1 border-b px-3 py-1.5', isDark ? 'border-[#30363d] bg-[#161b22]' : 'border-border bg-muted/20')}>
          <button type="button" disabled={!connected} onClick={sendControlC} className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground" title="Send Ctrl+C">
            <Keyboard className="h-3.5 w-3.5" /> Ctrl+C
          </button>
          <button type="button" onClick={clearTerminal} className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground" title="Clear terminal">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
          <button type="button" onClick={() => void copyLog()} className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground" title="Copy selected text or full terminal log">
            <Copy className="h-3.5 w-3.5" /> Copy log
          </button>
        </div>

        <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 text-xs',isDark ? 'border-[#30363d] text-[#8b949e]' : 'border-border text-muted-foreground')}>
          <span className="font-mono">{session.started ? `${session.ended ? 'Session duration' : 'Connected duration'} ${duration}` : 'Session not established'}</span>
          {limits && <span>Idle: {limits.idleSeconds ? `${limits.idleSeconds/60} min` : 'off'} · Max: {limits.maxSeconds ? `${limits.maxSeconds/60} min` : 'off'}</span>}
          <details><summary className="cursor-pointer">Session and audit policy</summary><p className="mt-2 max-w-2xl">{sessionAudit ? 'Connection and disconnection metadata are recorded in the audit log. Commands and output are not recorded.' : 'Session auditing has not been confirmed by the server. Commands and output are not recorded.'} {limits ? `Idle limit: ${limits.idleSeconds ? `${limits.idleSeconds/60} minutes without input` : 'disabled'}. Maximum duration: ${limits.maxSeconds ? `${limits.maxSeconds/60} minutes` : 'disabled'}. Output does not reset inactivity. Expiry disconnects SSH and may interrupt foreground work.` : 'Session expiry policy has not been reported by this server.'} SSH host policies and connection loss may also close it. Closing this window disconnects SSH. Copy log exports the visible local terminal buffer.</p></details>
          <button type="button" className="ml-auto inline-flex items-center gap-1.5 rounded px-2 py-1 hover:bg-accent" aria-pressed={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded ? <Minimize2 className="h-3.5 w-3.5"/> : <Maximize2 className="h-3.5 w-3.5"/>}{expanded ? 'Restore size' : 'Expand terminal'}</button>
        </div>

        <form className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs" onSubmit={event=>{event.preventDefault();findInTerminal();}}>
          <input aria-label="Search terminal buffer" value={search} onChange={event=>{setSearch(event.target.value);setSearchStatus('');searchCursor.current=null;}} placeholder="Find text (case-sensitive)" className="min-w-40 rounded border border-input bg-background px-2 py-1 text-foreground" />
          <button type="button" disabled={!search} onClick={()=>findInTerminal(true)} className="rounded px-2 py-1 text-muted-foreground disabled:opacity-50">Previous</button>
          <button type="submit" disabled={!search} className="rounded px-2 py-1 text-muted-foreground disabled:opacity-50">Next</button>
          <span role="status" className="text-muted-foreground">{searchStatus}</span>
          <span className="ml-auto text-muted-foreground">Local buffer · up to 5,000 scrollback lines</span>
        </form>

        {copyStatus && <p role="status" className="border-b border-border px-4 py-2 text-xs text-muted-foreground">{copyStatus}</p>}
        {disconnectMessage && <div role="status" className="border-b border-border bg-muted px-4 py-3 text-sm text-foreground"><p className="font-medium">Terminal disconnected</p><p className="mt-1">{disconnectMessage}</p><p className="mt-1 text-xs text-muted-foreground">No commands are being sent from this terminal. Previously started remote work may still be running; check its state before repeating it. The local output remains available to search or copy.</p></div>}
        {/* Terminal container */}
        <div className={cn('flex-1 min-w-0 overflow-hidden p-3 sm:p-4', isDark ? 'bg-[#0d1117]' : 'bg-white')}>
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </div>
    </div>,
    document.body
  );
}
