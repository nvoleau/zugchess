-- CreateEnum
CREATE TYPE "Role" AS ENUM ('player', 'admin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'player';
