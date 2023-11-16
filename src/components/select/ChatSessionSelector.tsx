import {
  NEW_CHAT_LABEL,
  useChatLogSessions,
} from "@/hooks/dev/useChatLogSession";
import classNames from "classnames";
import dayjs from "dayjs";

interface ChatSessionSelectorProps {
  versionUuid: string;
  selectedSessionUuid: string;
  setSelectedSessionUuid: (uuid: string) => void;
}

export const ChatSessionSelector = (props: ChatSessionSelectorProps) => {
  const { chatLogSessionListData } = useChatLogSessions(props.versionUuid);

  return (
    <select
      className={classNames(
        // "flex flex-row justify-between items-center p-2 rounded-md bg-base-content/10 text-base-content cursor-pointer",
        "select select-sm bg-input hover:bg-input/70 active:outline-none focus:outline-none",
        "transition-all hover:bg-base-content/20 max-w-[11rem]"
      )}
      value={props.selectedSessionUuid}
      onChange={(e) => {
        if (e.target.value === NEW_CHAT_LABEL) {
          props.setSelectedSessionUuid(null);
        } else {
          props.setSelectedSessionUuid(e.target.value);
        }
      }}
    >
      {chatLogSessionListData?.map((session) => {
        return (
          <option key={session.uuid} value={session.uuid}>
            {session.name ??
              dayjs(session.created_at).format("YYYY-MM-DD HH:mm:ss")}
          </option>
        );
      })}
    </select>
  );
};
