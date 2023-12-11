import * as amplitude from "@amplitude/analytics-browser";
import { env, PRODUCT_NAME } from "@/constants";

export const initAmplitude = () => {
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
  if (process.env.NODE_ENV == "development") return;
  amplitude.logEvent(event, {
    ...data,
  });
};

export default amplitude;
