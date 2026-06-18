
import { io } from "socket.io-client";
import { apiUrl } from "./services/api";

const socket = io(apiUrl);

export default socket;