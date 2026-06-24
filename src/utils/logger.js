const levels = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(level = "info") {
  const threshold = levels[level] ?? levels.info;

  function write(levelName, message, meta) {
    if ((levels[levelName] ?? levels.info) < threshold) return;

    const entry = {
      time: new Date().toISOString(),
      level: levelName,
      message,
      ...(meta ? { meta } : {})
    };

    const line = JSON.stringify(entry);
    if (levelName === "error") console.error(line);
    else if (levelName === "warn") console.warn(line);
    else console.log(line);
  }

  return {
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta)
  };
}
