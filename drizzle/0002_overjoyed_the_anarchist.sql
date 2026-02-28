ALTER TABLE `cartItems` MODIFY COLUMN `quantity` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `status` enum('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `shippingCost` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `galleryImages` json;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `stock` int;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `featured` int;