export const hlsVodConfig = {
  maxBufferLength: 60,
  maxMaxBufferLength: 600,
  maxBufferSize: 60 * 1000 * 1000,
  backBufferLength: 120,
  enableWorker: true,
  lowLatencyMode: false,
  fragLoadingTimeOut: 20000,
  manifestLoadingTimeOut: 20000,
  levelLoadingTimeOut: 20000,
  fragLoadingMaxRetry: 4,
  manifestLoadingMaxRetry: 4,
  levelLoadingMaxRetry: 4,
};
