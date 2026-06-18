-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isDelivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSeen" BOOLEAN NOT NULL DEFAULT false;
