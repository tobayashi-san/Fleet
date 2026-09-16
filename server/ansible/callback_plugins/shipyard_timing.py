"""Record cumulative observed task execution time per host, without task data."""
import json
import time
from ansible.plugins.callback import CallbackBase


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'aggregate'
    CALLBACK_NAME = 'shipyard_timing'
    CALLBACK_NEEDS_ENABLED = True

    def __init__(self):
        super().__init__()
        self.started = {}
        self.duration = {}

    def v2_runner_on_start(self, host, task):
        self.started[(host.get_name(), str(task._uuid))] = time.monotonic()

    def _finish(self, result):
        name = result._host.get_name()
        start = self.started.pop((name, str(result._task._uuid)), None)
        if start is not None:
            self.duration[name] = self.duration.get(name, 0) + max(0, time.monotonic() - start)

    def v2_runner_on_ok(self, result):
        self._finish(result)

    def v2_runner_on_failed(self, result, ignore_errors=False):
        self._finish(result)

    def v2_runner_on_unreachable(self, result):
        self._finish(result)

    def v2_runner_on_skipped(self, result):
        self._finish(result)

    def v2_playbook_on_stats(self, stats):
        self._display.display('__SHIPYARD_HOST_TIMING__' + json.dumps({name: round(seconds, 3) for name, seconds in self.duration.items()}))
