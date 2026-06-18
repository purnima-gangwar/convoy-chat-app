import { Request, Response } from "express";
import prisma from "../config/prisma";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { senderId, receiverId, text } = req.body;

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        text,
        isDelivered: false,
        isSeen: false,
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const senderId = req.params.senderId as string;
    const receiverId = req.params.receiverId as string;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId,
            receiverId,
          },
          {
            senderId: receiverId,
            receiverId: senderId,
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};