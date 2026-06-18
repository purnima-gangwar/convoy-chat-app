import { Request, Response } from "express";
import prisma from "../config/prisma";

export const getUsers = async (
  req: Request,
  res: Response
) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isOnline: true,
      },
    });

    const usersWithMessages =
      await Promise.all(
        users.map(async (user) => {
          const lastMessage =
            await prisma.message.findFirst({
              where: {
                OR: [
                  { senderId: user.id },
                  { receiverId: user.id },
                ],
              },
              orderBy: {
                createdAt: "desc",
              },
            });

          return {
            ...user,
            lastMessage:
              lastMessage?.text || "",
          };
        })
      );

    res
      .status(200)
      .json(usersWithMessages);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};