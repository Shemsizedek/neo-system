import winston from 'winston';

const redact = winston.format((info) => {
  const clone = { ...info };
  for (const key of ['authorization','accessToken','refreshToken','clientSecret','apiKey','approvalToken']) {
    if (key in clone) clone[key] = '[REDACTED]';
  }
  return clone;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(redact(), winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});
