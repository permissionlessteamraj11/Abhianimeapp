var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// bot/worker.js
var DEFAULT_BOT_TOKEN = "8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ";
var DEFAULT_API_ID = "37729457";
var MEMORY_STORE = {
  anime: [],
  movies: [],
  hero_banners: [],
  version: 1
};
var worker_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    const botToken = env2.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/set-webhook" || url.pathname === "/setup") {
      const webhookUrl = `${url.origin}/webhook`;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      const data = await res.json();
      return new Response(JSON.stringify({
        success: data.ok === true,
        message: data.ok ? "Webhook registered successfully with Telegram!" : "Failed to register webhook with Telegram.",
        bot_url: `https://t.me/starkanimebot`,
        webhook_url: webhookUrl,
        telegram_response: data,
        instructions: "Bot ready hai! Ab Telegram par bot open karke /start bhejien aur videos forward/upload karna shuru karein."
      }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/webhook" && request.method === "POST") {
      try {
        const update = await request.json();
        ctx.waitUntil(handleTelegramUpdate(update, env2, botToken, url.origin));
        return new Response("OK", { status: 200 });
      } catch (err) {
        return new Response(`Error: ${err.message}`, { status: 500 });
      }
    }
    if (url.pathname === "/api/catalog" || url.pathname === "/catalog") {
      const catalog2 = await getCatalog(env2);
      return new Response(JSON.stringify(catalog2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (url.pathname.startsWith("/api/stream/")) {
      const fileId = url.pathname.replace("/api/stream/", "");
      if (!fileId) return new Response("File ID required", { status: 400 });
      const filePathRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const filePathData = await filePathRes.json();
      if (!filePathData.ok || !filePathData.result?.file_path) {
        return new Response("File not found in Telegram storage", { status: 404 });
      }
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePathData.result.file_path}`;
      return Response.redirect(fileUrl, 302);
    }
    const catalog = await getCatalog(env2);
    let totalEps = 0;
    (catalog.anime || []).forEach((a) => {
      a.seasons?.forEach((s) => {
        totalEps += s.episodes?.length || 0;
      });
    });
    return new Response(JSON.stringify({
      status: "online",
      service: "Stark Anime Telegram Bot & Cloudflare Engine",
      bot_token: botToken.slice(0, 10) + "...",
      api_id: DEFAULT_API_ID,
      urls: {
        set_webhook: `${url.origin}/set-webhook`,
        webhook_endpoint: `${url.origin}/webhook`,
        catalog_api: `${url.origin}/api/catalog`,
        stream_base: `${url.origin}/api/stream/`
      },
      stats: {
        total_anime: catalog.anime?.length || 0,
        total_movies: catalog.movies?.length || 0,
        total_episodes: totalEps,
        version: catalog.version || 1
      },
      setup_instructions: [
        `1. Click or open: ${url.origin}/set-webhook`,
        `2. Open your bot in Telegram and send /start`,
        `3. Send or forward anime videos with caption: /ep <anime_id> <season_num> <ep_num> [quality] <Episode Title>`
      ]
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
async function handleTelegramUpdate(update, env2, botToken, origin) {
  if (!update.message) return;
  const msg = update.message;
  const chatId = msg.chat.id;
  const text = (msg.text || msg.caption || "").trim();
  if (text.startsWith("/start")) {
    await sendTelegramMessage(botToken, chatId, `
\u26A1 *Stark Anime - Episode & Video Upload Bot*

Welcome! Is bot se aap Anime Series, Seasons aur Episodes direct upload & control kar sakte ho. Multi-quality (480p, 720p, 1080p) videos control ho jayengi.

*Main Commands:*
\u2022 \`/addanime <Title>\` - Naya Anime banayein
\u2022 \`/listanime\` - Sabhi Anime series list karein with IDs
\u2022 \`/editanime <anime_id> <field> <value>\` - Anime detail edit karein
\u2022 \`/editepisode <anime_id> <season_num> <ep_num> <field> <value>\` - Episode edit karein
\u2022 \`/forward <anime_id> <season_num> <ep_num>\` - Episode videos bot chat me mangwaye
\u2022 \`/status\` - Storage & database stats

*Video Uploading / Forwarding:*
Kisi bhi 480p, 720p, 1080p video ko bot me bhejien/forward karein aur caption me likhein:
\`/ep <anime_id> <season_num> <ep_num> <quality> <Episode Title>\`
_Example:_ \`/ep anime_12345 1 1 1080p Episode 1 The Beginning\`
    `);
    return;
  }
  if (text.startsWith("/status")) {
    const catalog = await getCatalog(env2);
    let totalEps = 0;
    (catalog.anime || []).forEach((a) => {
      a.seasons?.forEach((s) => {
        totalEps += s.episodes?.length || 0;
      });
    });
    await sendTelegramMessage(botToken, chatId, `
\u{1F4CA} *Cloudflare Storage Status*
\u2022 Total Anime: *${catalog.anime?.length || 0}*
\u2022 Total Movies: *${catalog.movies?.length || 0}*
\u2022 Total Episodes: *${totalEps}*
\u2022 Catalog Version: *v${catalog.version || 1}*
\u2022 Origin URL: \`${origin}\`
    `);
    return;
  }
  if (text.startsWith("/addanime")) {
    const parts = text.split(" ");
    parts.shift();
    const title2 = parts.join(" ").trim();
    if (!title2) {
      await sendTelegramMessage(botToken, chatId, "\u274C Usage: `/addanime Naruto Shippuden`");
      return;
    }
    const catalog = await getCatalog(env2);
    catalog.anime = catalog.anime || [];
    const animeId = `anime_${Date.now()}`;
    const newAnime = {
      id: animeId,
      title: title2,
      slug: title2.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: `${title2} anime series.`,
      poster_url: "/images/stark_anime_logo_1790699252710.jpg",
      backdrop_url: "/images/stark_anime_logo_1790699252710.jpg",
      rating: 9,
      release_year: (/* @__PURE__ */ new Date()).getFullYear(),
      status: "Ongoing",
      classification: "PG-13",
      language: "Japanese",
      available_audio: ["Japanese", "Hindi", "English"],
      available_subtitles: ["English", "Hindi"],
      distribution_rights_confirmed: true,
      is_published: true,
      genres: ["Action", "Adventure"],
      categories: ["all", "anime"],
      seasons: [
        {
          id: `s1_${animeId}`,
          anime_id: animeId,
          season_number: 1,
          title: "Season 1",
          description: "Season 1",
          is_published: true,
          episodes: []
        }
      ]
    };
    catalog.anime.push(newAnime);
    await saveCatalog(env2, catalog);
    await sendTelegramMessage(botToken, chatId, `
\u2705 *Anime Created Successfully!*
\u2022 Title: *${title2}*
\u2022 Anime ID: \`${animeId}\`
\u2022 Default Season: \`Season 1\`

Video bhejien aur caption:
\`/ep ${animeId} 1 1 1080p Episode 1 Title\`
    `);
    return;
  }
  if (text.startsWith("/listanime")) {
    const catalog = await getCatalog(env2);
    const animeList = catalog.anime || [];
    if (animeList.length === 0) {
      await sendTelegramMessage(botToken, chatId, "\u2139\uFE0F Catalog me koi anime nahi hai. `/addanime <Title>` se pehle anime create karein.");
      return;
    }
    let msgText = "\u{1F4FA} *Anime Catalog List:*\n\n";
    animeList.forEach((a, idx) => {
      const epCount = a.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;
      msgText += `${idx + 1}. *${a.title}*
   \u2022 ID: \`${a.id}\`
   \u2022 Seasons: ${a.seasons?.length || 0} | Episodes: ${epCount}

`;
    });
    await sendTelegramMessage(botToken, chatId, msgText);
    return;
  }
  if (text.startsWith("/editanime")) {
    const parts = text.split(" ");
    parts.shift();
    if (parts.length < 3) {
      await sendTelegramMessage(botToken, chatId, "\u274C Usage: `/editanime <anime_id> <title|description|poster_url|status> <value>`");
      return;
    }
    const animeId = parts[0];
    const field = parts[1].toLowerCase();
    const value = parts.slice(2).join(" ");
    const catalog = await getCatalog(env2);
    const anime = (catalog.anime || []).find((a) => a.id === animeId);
    if (!anime) {
      await sendTelegramMessage(botToken, chatId, `\u274C Anime ID \`${animeId}\` not found! Use \`/listanime\`.`);
      return;
    }
    if (field === "title") {
      anime.title = value;
      anime.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    } else if (field === "description") {
      anime.description = value;
    } else if (field === "poster_url" || field === "poster") {
      anime.poster_url = value;
    } else if (field === "status") {
      anime.status = value;
    } else {
      await sendTelegramMessage(botToken, chatId, "\u274C Valid fields: `title`, `description`, `poster_url`, `status`");
      return;
    }
    await saveCatalog(env2, catalog);
    await sendTelegramMessage(botToken, chatId, `\u2705 *Anime Updated!* Field *${field}* set to: ${value}`);
    return;
  }
  if (text.startsWith("/editepisode")) {
    const parts = text.split(" ");
    parts.shift();
    if (parts.length < 5) {
      await sendTelegramMessage(botToken, chatId, "\u274C Usage: `/editepisode <anime_id> <season_num> <ep_num> <title|description> <value>`");
      return;
    }
    const animeId = parts[0];
    const seasonNum = parseInt(parts[1]) || 1;
    const epNum = parseInt(parts[2]) || 1;
    const field = parts[3].toLowerCase();
    const value = parts.slice(4).join(" ");
    const catalog = await getCatalog(env2);
    const anime = (catalog.anime || []).find((a) => a.id === animeId);
    const season = anime?.seasons?.find((s) => s.season_number === seasonNum);
    const episode = season?.episodes?.find((e) => e.episode_number === epNum);
    if (!episode) {
      await sendTelegramMessage(botToken, chatId, `\u274C Episode not found for Anime \`${animeId}\` S${seasonNum} E${epNum}`);
      return;
    }
    if (field === "title") {
      episode.title = value;
    } else if (field === "description") {
      episode.description = value;
    } else {
      await sendTelegramMessage(botToken, chatId, "\u274C Valid fields: `title`, `description`");
      return;
    }
    await saveCatalog(env2, catalog);
    await sendTelegramMessage(botToken, chatId, `\u2705 *Episode S${seasonNum} E${epNum} Updated!* ${field} = ${value}`);
    return;
  }
  if (text.startsWith("/forward")) {
    const parts = text.split(" ");
    parts.shift();
    if (parts.length < 3) {
      await sendTelegramMessage(botToken, chatId, "\u274C Usage: `/forward <anime_id> <season_num> <ep_num>`");
      return;
    }
    const animeId = parts[0];
    const seasonNum = parseInt(parts[1]) || 1;
    const epNum = parseInt(parts[2]) || 1;
    const catalog = await getCatalog(env2);
    const anime = (catalog.anime || []).find((a) => a.id === animeId);
    const season = anime?.seasons?.find((s) => s.season_number === seasonNum);
    const episode = season?.episodes?.find((e) => e.episode_number === epNum);
    if (!episode) {
      await sendTelegramMessage(botToken, chatId, `\u274C Episode S${seasonNum} E${epNum} not found for Anime \`${animeId}\`.`);
      return;
    }
    let forwardMsg = `\u{1F3AC} *${anime.title}* - Season ${seasonNum} Episode ${epNum}
\u2022 Title: *${episode.title}*

*Available Video Qualities & Streams:*
`;
    if (episode.video_assets && episode.video_assets.length > 0) {
      episode.video_assets.forEach((va) => {
        forwardMsg += `\u2022 *${va.quality}*: [Stream Link](${va.stream_url})
`;
      });
    } else if (episode.stream_url) {
      forwardMsg += `\u2022 *Default (${episode.quality || "1080p"})*: [Stream Link](${episode.stream_url})
`;
    }
    await sendTelegramMessage(botToken, chatId, forwardMsg);
    if (episode.video_assets && episode.video_assets.length > 0) {
      for (const va of episode.video_assets) {
        if (va.telegram_file_id) {
          try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                video: va.telegram_file_id,
                caption: `\u{1F4F9} *${anime.title}* S${seasonNum} E${epNum} (${va.quality})`
              })
            });
          } catch {
          }
        }
      }
    } else if (episode.telegram_file_id) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            video: episode.telegram_file_id,
            caption: `\u{1F4F9} *${anime.title}* S${seasonNum} E${epNum}`
          })
        });
      } catch {
      }
    }
    return;
  }
  if (msg.video || msg.document) {
    const file = msg.video || msg.document;
    const fileId = file.file_id;
    const streamUrl = `${origin}/api/stream/${fileId}`;
    if (text.startsWith("/ep")) {
      const parts = text.split(" ");
      parts.shift();
      if (parts.length < 3) {
        await sendTelegramMessage(botToken, chatId, `
\u274C *Invalid Caption Format!*
Format: \`/ep <anime_id> <season_num> <ep_num> [quality] <Episode Title>\`
Example: \`/ep anime_12345 1 1 1080p Episode 1 Title\`
        `);
        return;
      }
      const animeId = parts[0];
      const seasonNum = parseInt(parts[1]) || 1;
      const epNum = parseInt(parts[2]) || 1;
      let quality = "1080p";
      let titleStartIdx = 3;
      if (parts[3] && ["480p", "720p", "1080p", "360p", "4k"].includes(parts[3].toLowerCase())) {
        quality = parts[3];
        titleStartIdx = 4;
      }
      const epTitle = parts.slice(titleStartIdx).join(" ") || `Episode ${epNum}`;
      const catalog = await getCatalog(env2);
      const anime = (catalog.anime || []).find((a) => a.id === animeId);
      if (!anime) {
        await sendTelegramMessage(botToken, chatId, `\u274C Anime with ID \`${animeId}\` not found! Use \`/listanime\` to check IDs.`);
        return;
      }
      let season = anime.seasons?.find((s) => s.season_number === seasonNum);
      if (!season) {
        season = {
          id: `s${seasonNum}_${animeId}`,
          anime_id: animeId,
          season_number: seasonNum,
          title: `Season ${seasonNum}`,
          description: `Season ${seasonNum}`,
          is_published: true,
          episodes: []
        };
        anime.seasons = anime.seasons || [];
        anime.seasons.push(season);
      }
      season.episodes = season.episodes || [];
      let episode = season.episodes.find((e) => e.episode_number === epNum);
      if (!episode) {
        episode = {
          id: `ep_${seasonNum}_${epNum}_${Date.now()}`,
          anime_id: animeId,
          season_id: season.id,
          episode_number: epNum,
          title: epTitle,
          description: `${anime.title} Season ${seasonNum} Episode ${epNum}`,
          duration_seconds: file.duration || 1440,
          thumbnail_url: anime.poster_url,
          stream_url: streamUrl,
          telegram_file_id: fileId,
          quality,
          view_count: 0,
          is_published: true,
          distribution_rights_confirmed: true,
          video_assets: []
        };
        season.episodes.push(episode);
      } else {
        episode.title = epTitle || episode.title;
      }
      episode.video_assets = episode.video_assets || [];
      const assetIdx = episode.video_assets.findIndex((va) => va.quality === quality);
      const newAsset = {
        id: `va_${quality}_${Date.now()}`,
        parent_type: "episode",
        parent_id: episode.id,
        quality,
        storage_key: fileId,
        stream_url: streamUrl,
        telegram_file_id: fileId,
        duration_seconds: file.duration || 1440,
        file_size_bytes: file.file_size || 0
      };
      if (assetIdx >= 0) {
        episode.video_assets[assetIdx] = newAsset;
      } else {
        episode.video_assets.push(newAsset);
      }
      if (quality === "1080p" || !episode.stream_url) {
        episode.stream_url = streamUrl;
        episode.telegram_file_id = fileId;
        episode.quality = quality;
      }
      await saveCatalog(env2, catalog);
      await sendTelegramMessage(botToken, chatId, `
\u{1F389} *Episode (${quality}) Saved to Cloudflare!*

\u2022 Anime: *${anime.title}*
\u2022 Season ${seasonNum} | Episode ${epNum}: *${episode.title}*
\u2022 Quality Added: *${quality}*
\u2022 Stream Link: \`${streamUrl}\`

Live on mini-app/website! Video forward karne ke liye command use karein:
\`/forward ${animeId} ${seasonNum} ${epNum}\`
      `);
      return;
    }
    await sendTelegramMessage(botToken, chatId, `
\u{1F4F9} *Video File Received!*

Episode ko save karne ke liye video par reply karein ya caption ke saath bhejien:
\`/ep <anime_id> <season_num> <ep_num> [480p|720p|1080p] <Episode Title>\`

*Stream Link Generated:*
\`${streamUrl}\`
    `);
    return;
  }
}
__name(handleTelegramUpdate, "handleTelegramUpdate");
async function getCatalog(env2) {
  if (env2 && env2.STARK_ANIME_KV) {
    try {
      const data = await env2.STARK_ANIME_KV.get("catalog", { type: "json" });
      if (data) return data;
    } catch {
    }
  }
  return MEMORY_STORE;
}
__name(getCatalog, "getCatalog");
async function saveCatalog(env2, catalog) {
  catalog.version = (catalog.version || 1) + 1;
  catalog.last_updated_at = (/* @__PURE__ */ new Date()).toISOString();
  if (env2 && env2.STARK_ANIME_KV) {
    try {
      await env2.STARK_ANIME_KV.put("catalog", JSON.stringify(catalog));
    } catch {
    }
  }
  MEMORY_STORE = catalog;
  return catalog;
}
__name(saveCatalog, "saveCatalog");
async function sendTelegramMessage(botToken, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown"
      })
    });
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}
__name(sendTelegramMessage, "sendTelegramMessage");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
