import * as amplitude from "@amplitude/analytics-browser";
import { env, PRODUCT_NAME } from "@/constants";

export const initAmplitude = () => {
  if (!env.AMPLITUDE_API_KEY) return;
  amplitude.init(env.AMPLITUDE_API_KEY, undefined, {
    defaultTracking: {
      sessions: true,
      pageViews: false,
      formInteractions: false,
      fileDownloads: true,
    },
  });
};

export const logEvent = (event: string, data?: any) => {
  if (process.env.NODE_ENV == "development" || !env.AMPLITUDE_API_KEY) return;
  amplitude.logEvent(event, {
    ...data,
  });
};

export default amplitude;
