import { Router } from "express";
import {
  sendMessage,
  getMessages,
} from "../controllers/messageController";

const router = Router();

router.post("/send", sendMessage);

router.get(
  "/:senderId/:receiverId",
  getMessages
);


export default router;