-- MySQL dump 10.13  Distrib 8.0.39, for Linux (x86_64)
--
-- Host: localhost    Database: wagazap
-- ------------------------------------------------------
-- Server version	8.0.39-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS wagazap;
USE wagazap;

--
-- Table structure for table `Nagazap`
--

DROP TABLE IF EXISTS `Nagazap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Nagazap` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastUpdated` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `appId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phoneId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bussinessId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stack` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `blacklist` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `frequency` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchSize` int NOT NULL,
  `lastMessageTime` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paused` tinyint(1) NOT NULL,
  `sentMessages` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `failedMessages` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Nagazap`
--

LOCK TABLES `Nagazap` WRITE;
/*!40000 ALTER TABLE `Nagazap` DISABLE KEYS */;
/*!40000 ALTER TABLE `Nagazap` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NagazapMessage`
--

DROP TABLE IF EXISTS `NagazapMessage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NagazapMessage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `from` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NagazapMessage`
--

LOCK TABLES `NagazapMessage` WRITE;
/*!40000 ALTER TABLE `NagazapMessage` DISABLE KEYS */;
/*!40000 ALTER TABLE `NagazapMessage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Washima`
--

DROP TABLE IF EXISTS `Washima`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Washima` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `number` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Washima`
--

LOCK TABLES `Washima` WRITE;
/*!40000 ALTER TABLE `Washima` DISABLE KEYS */;
/*!40000 ALTER TABLE `Washima` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `WashimaGroupUpdates`
--

DROP TABLE IF EXISTS `WashimaGroupUpdates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WashimaGroupUpdates` (
  `sid` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `washima_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chat_id` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `id` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `author` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipientIds` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`sid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `WashimaGroupUpdates`
--

LOCK TABLES `WashimaGroupUpdates` WRITE;
/*!40000 ALTER TABLE `WashimaGroupUpdates` DISABLE KEYS */;
/*!40000 ALTER TABLE `WashimaGroupUpdates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `WashimaMedia`
--

DROP TABLE IF EXISTS `WashimaMedia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WashimaMedia` (
  `message_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `mimetype` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `WashimaMedia`
--

LOCK TABLES `WashimaMedia` WRITE;
/*!40000 ALTER TABLE `WashimaMedia` DISABLE KEYS */;
/*!40000 ALTER TABLE `WashimaMedia` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `WashimaMessage`
--

DROP TABLE IF EXISTS `WashimaMessage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WashimaMessage` (
  `sid` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `washima_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chat_id` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `id` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `author` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `from` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fromMe` tinyint(1) NOT NULL,
  `hasMedia` tinyint(1) NOT NULL,
  `timestamp` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `to` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ack` int DEFAULT NULL,
  PRIMARY KEY (`sid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `WashimaMessage`
--

LOCK TABLES `WashimaMessage` WRITE;
/*!40000 ALTER TABLE `WashimaMessage` DISABLE KEYS */;
/*!40000 ALTER TABLE `WashimaMessage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `WashimaProfilePic`
--

DROP TABLE IF EXISTS `WashimaProfilePic`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WashimaProfilePic` (
  `chat_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_updated` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `WashimaProfilePic`
--

LOCK TABLES `WashimaProfilePic` WRITE;
/*!40000 ALTER TABLE `WashimaProfilePic` DISABLE KEYS */;
/*!40000 ALTER TABLE `WashimaProfilePic` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('6e36c5da-52f2-4fae-bdf7-d29c91381199','23a0e0a2f4f96752576c47fe7f52eea8d99eec9ee8ad75e26b11d9dc196eb2c1','2024-11-02 18:35:16.665','20241102152643_init',NULL,NULL,'2024-11-02 18:35:16.552',1),('9a3594f3-d7ea-418a-8c4e-32ba340e9485','109199eb779c2d30a0fd77b43e4e255c761c4a7fdf23b307818ac84e7b47e3e4','2024-11-02 19:47:22.699','20241102194722_removed_created_by',NULL,NULL,'2024-11-02 19:47:22.576',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-11-04 11:31:42
