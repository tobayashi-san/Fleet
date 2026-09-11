import { Button } from '@/components/ui/button';
const template = "# Set APP_IMAGE in a .env file in this stack directory before starting.\n# Pin an approved image tag or digest for reproducible deployments.\nservices:\n  app:\n    image: ${APP_IMAGE:?Set APP_IMAGE to your application image}\n    restart: unless-stopped\n";
export function ComposeTemplateButton({content, disabled, onInsert}: {content:string; disabled:boolean; onInsert:(content:string)=>void}) {
  return <div className="flex flex-wrap items-center gap-2">
    <Button type="button" size="sm" variant="outline" disabled={Boolean(content.trim()) || disabled} onClick={() => { if (!content.trim() && !disabled) onInsert(template); }}>Insert minimal template</Button>
    <span className="text-xs text-muted-foreground">Empty editor only. Add application-specific ports, volumes and environment variables before starting.</span>
  </div>;
}
