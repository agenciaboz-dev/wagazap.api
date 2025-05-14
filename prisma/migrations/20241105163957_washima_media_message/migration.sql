-- AddForeignKey
ALTER TABLE `WashimaMedia` ADD CONSTRAINT `WashimaMedia_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `WashimaMessage`(`sid`) ON DELETE RESTRICT ON UPDATE CASCADE;
