import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export const createUserChatWS = ({ roomId, onMessage }) => {
  const socket = new SockJS("http://${WS_BASE_URL}:9100/ws-chat");

  const client = new Client({
    webSocketFactory: () => socket,
    debug: () => {},
    onConnect: () => {
      client.subscribe(`/topic/room/${roomId}`, (msg) => {
        onMessage(JSON.parse(msg.body));
      });
    },
  });

  client.activate();

  return {
    send: ({ senderNo, content }) => {
      client.publish({
        destination: "/app/chat.send",
        body: JSON.stringify({
          roomId,
          hotelExtId: null,
          senderType: "USER",
          senderNo,
          content,
        }),
      });
    },
    disconnect: () => client.deactivate(),
  };
};
