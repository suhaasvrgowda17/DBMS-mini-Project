-- =====================================================================
-- TravelMate Travel Agency Management System MySQL Database Schema & Seed Data
-- Database Name: TravelAgencyManagementSystem
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `TravelAgencyManagementSystem`;
USE `TravelAgencyManagementSystem`;

-- Temporarily disable foreign key checks to allow dropping and recreating tables smoothly
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `agents`;
DROP TABLE IF EXISTS `admins`;
DROP TABLE IF EXISTS `tour_packages`;
DROP TABLE IF EXISTS `promo_codes`;
DROP TABLE IF EXISTS `discounts`;

-- 1. Standalone Admins Table
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` ENUM('system_administrator', 'package_manager', 'customer_manager', 'payment_verifier') DEFAULT 'system_administrator',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Standalone Agents Table
CREATE TABLE IF NOT EXISTS `agents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(15) NOT NULL UNIQUE,
  `agency_commission` DECIMAL(5,2) DEFAULT 10.00,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Standalone Customers Table
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(15) NOT NULL UNIQUE,
  `address` TEXT,
  `passport_number` VARCHAR(50) DEFAULT NULL,
  `profile_image` VARCHAR(255) DEFAULT NULL,
  `assigned_agent_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`assigned_agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tour Packages Table
CREATE TABLE IF NOT EXISTS `tour_packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `destination` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `duration` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `category` ENUM('Adventure', 'Luxury', 'Family', 'Honeymoon', 'Cultural') DEFAULT 'Family',
  `available_slots` INT DEFAULT 50,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_package_price CHECK (`price` > 0),
  CONSTRAINT chk_package_slots CHECK (`available_slots` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.5 Discounts Table
CREATE TABLE IF NOT EXISTS `discounts` (
  `promo_code` VARCHAR(50) PRIMARY KEY,
  `discount_percent` DECIMAL(5,2) NOT NULL,
  `max_discount` DECIMAL(10,2) DEFAULT NULL,
  `expiry_date` DATE NOT NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_discount_percent CHECK (`discount_percent` > 0 AND `discount_percent` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bookings Table
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_reference` VARCHAR(20) NOT NULL UNIQUE,
  `customer_id` INT NOT NULL,
  `package_id` INT NOT NULL,
  `agent_id` INT DEFAULT NULL,
  `travel_date` DATE NOT NULL,
  `number_of_travelers` INT DEFAULT 1,
  `total_price` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  `cancellation_reason` TEXT DEFAULT NULL,
  `applied_promo_code` VARCHAR(50) DEFAULT NULL,
  `booking_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`package_id`) REFERENCES `tour_packages` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`applied_promo_code`) REFERENCES `discounts` (`promo_code`) ON DELETE SET NULL,
  CONSTRAINT chk_travelers CHECK (`number_of_travelers` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('Credit Card', 'Debit Card', 'UPI', 'PayPal', 'Bank Transfer') NOT NULL,
  `transaction_id` VARCHAR(100) NOT NULL UNIQUE,
  `status` ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT chk_payment_amount CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =====================================================================
CREATE INDEX idx_customer_booking ON bookings(customer_id);
CREATE INDEX idx_agent_booking ON bookings(agent_id);
CREATE INDEX idx_package_booking ON bookings(package_id);
CREATE INDEX idx_payment_customer ON payments(customer_id);
CREATE INDEX idx_promo_booking ON bookings(applied_promo_code);

-- =====================================================================
-- AUTOMATED BUSINESS LOGIC TRIGGERS
-- =====================================================================
DROP TRIGGER IF EXISTS `before_booking_insert_nullify_promo`;
DROP TRIGGER IF EXISTS `before_booking_insert_apply_promo`;

-- 1. Trigger to validate and nullify invalid/expired/inactive promo code
CREATE TRIGGER `before_booking_insert_nullify_promo`
BEFORE INSERT ON `bookings`
FOR EACH ROW
  SET NEW.applied_promo_code = (
    SELECT pc.promo_code 
    FROM `discounts` pc
    WHERE pc.promo_code = NEW.applied_promo_code AND pc.status = 'active' AND pc.expiry_date >= CURDATE()
  );

-- 2. Trigger to calculate total_price dynamically and apply active promo code discount
CREATE TRIGGER `before_booking_insert_apply_promo`
BEFORE INSERT ON `bookings`
FOR EACH ROW
  SET NEW.total_price = (
    SELECT 
      CASE 
        WHEN NEW.applied_promo_code IS NOT NULL THEN
          ((tp.price * NEW.number_of_travelers) - 
           COALESCE(
             (tp.price * NEW.number_of_travelers * pc.discount_percent) / 100, 
             0
           ))
        ELSE 
          tp.price * NEW.number_of_travelers
      END
    FROM `tour_packages` tp
    LEFT JOIN `discounts` pc ON pc.promo_code = NEW.applied_promo_code
    WHERE tp.id = NEW.package_id
  );

-- =====================================================================
-- Seed Data Initialization
-- All seed accounts have password: password123
-- Pre-hashed Bcrypt Hash: $2a$10$nudhtydEd3SB./8LX6.LE.vkKgeCRE8EAa9CdJFf9XOAXMDhx7GOu
-- =====================================================================

-- 1. Insert Seed Admins
INSERT INTO `admins` (`id`, `username`, `email`, `password`, `name`, `role`) VALUES
(1, 'admin', 'admin@travelagency.com', '$2a$10$nudhtydEd3SB./8LX6.LE.vkKgeCRE8EAa9CdJFf9XOAXMDhx7GOu', 'V R Suhaas Gowda', 'system_administrator'),
(2, 'pkg_admin', 'packages@travelagency.com', '$2a$10$nudhtydEd3SB./8LX6.LE.vkKgeCRE8EAa9CdJFf9XOAXMDhx7GOu', 'Vikram Malhotra', 'package_manager'),
(3, 'cust_admin', 'customers@travelagency.com', '$2a$10$nudhtydEd3SB./8LX6.LE.vkKgeCRE8EAa9CdJFf9XOAXMDhx7GOu', 'Sneha Rao', 'customer_manager'),
(4, 'pay_admin', 'payments@travelagency.com', '$2a$10$nudhtydEd3SB./8LX6.LE.vkKgeCRE8EAa9CdJFf9XOAXMDhx7GOu', 'Amit Patel', 'payment_verifier');

-- 2. Insert Seed Agents
INSERT INTO `agents` (`id`, `username`, `email`, `password`, `name`, `phone`, `agency_commission`, `status`) VALUES
(1, 'agent1', 'agent1@travelagency.com', '$2a$10$nudhtydEd3SB./8LX6.LE.vkKgeCRE8EAa9CdJFf9XOAXMDhx7GOu', 'John Miller', '5551234567', 12.50, 'active'),
(2, 'agent2', 'agent2@travelagency.com', '$2a$10$nudhtydEd3SB./8LX6.LE.vkKgeCRE8EAa9CdJFf9XOAXMDhx7GOu', 'Sarah Jenkins', '5559876543', 15.00, 'active'),
(3, 'punith_agent', 'punith@travelagency.com', '$2a$10$Z62z.IyzFeVZ0VzUSZI4GOZp.qS6aSJ5NEsDlb0eHhp7/0Ascg3NO', 'Punith', '9988776655', 10.00, 'active'),
(4, 'thulasiram_agent', 'thulasiram@travelagency.com', '$2a$10$9HDlgSxawDr2upxL/OtRI.JmEsefM/1Op77lGSQ68zbrewFPvdMpu', 'Thulasi Ram', '9988776644', 12.00, 'active');

-- 3. Insert Seed Customers (assigned_agent_id references agents.id)
INSERT INTO `customers` (`id`, `username`, `email`, `password`, `name`, `phone`, `address`, `passport_number`, `assigned_agent_id`) VALUES
(4, 'suhaas321', 'suhaas@gmail.com', '$2a$10$bGzsWGvFFhS.efLkLpL8Ou7HB004w5/8X8ihP2yZV4aaQEo.OUYxq', 'suhaas', '9998887776', '123 Tech Park, Bangalore', 'S99887766', 3),
(5, 'vani321', 'vani@gmail.com', '$2a$10$bGzsWGvFFhS.efLkLpL8Ou7HB004w5/8X8ihP2yZV4aaQEo.OUYxq', 'vani', '9998887775', '456 MG Road, Bangalore', 'V99887765', 3),
(6, 'rudravinayak321', 'rudravinayak@gmail.com', '$2a$10$bGzsWGvFFhS.efLkLpL8Ou7HB004w5/8X8ihP2yZV4aaQEo.OUYxq', 'rudravinayak', '9998887774', '789 Palace Grounds, Mysore', 'R99887764', 3),
(7, 'sinchana321', 'sinchana@gmail.com', '$2a$10$bGzsWGvFFhS.efLkLpL8Ou7HB004w5/8X8ihP2yZV4aaQEo.OUYxq', 'sinchana', '9998887773', '321 Ring Road, Hubli', 'S99887763', 3),
(8, 'sahana321', 'sahana@gmail.com', '$2a$10$bGzsWGvFFhS.efLkLpL8Ou7HB004w5/8X8ihP2yZV4aaQEo.OUYxq', 'sahana', '9998887772', '654 Central Ave, Mangalore', 'S99887762', 1);

-- 3.5 Insert Seed Discounts
INSERT INTO `discounts` (`promo_code`, `discount_percent`, `max_discount`, `expiry_date`, `status`) VALUES
('WELCOME10', 10.00, 5000.00, '2027-12-31', 'active'),
('SUMMER20', 20.00, 10000.00, '2027-08-31', 'active'),
('EXPIRED50', 50.00, 20000.00, '2025-01-01', 'active'),
('DISABLED15', 15.00, 3000.00, '2027-12-31', 'inactive');

-- 4. Insert Premium Tour Packages
INSERT INTO `tour_packages` (`id`, `name`, `destination`, `price`, `duration`, `description`, `category`, `available_slots`, `image_url`) VALUES
(1, 'Tropical Paradise Gateway', 'Maldives', 120000.00, '5 Days / 4 Nights', 'Experience the luxury of overwater villas, crystal-clear turquoise waters, and vibrant marine life with our fully curated tropical Maldives holiday.', 'Luxury', 45, 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=480&q=60'),
(2, 'Swiss Alps Majestic Explorer', 'Switzerland', 210000.00, '7 Days / 6 Nights', 'Embark on a breath-taking mountain escape. Ride scenic trains, hike through beautiful valleys, and stay in premium alpine cabins in Zermatt and Interlaken.', 'Adventure', 28, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=480&q=60'),
(3, 'Ancient Wonders of Kyoto', 'Kyoto, Japan', 160000.00, '6 Days / 5 Nights', 'Immerse yourself in traditional Japanese culture. Visit historic shrines, stroll beneath cherry blossoms, and enjoy high-end Kaiseki dining experiences.', 'Cultural', 30, 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=480&q=60'),
(4, 'European Heritage Journey', 'Rome, Italy', 180000.00, '8 Days / 7 Nights', 'Unveil thousands of years of human history. Tour the historic Colosseum, Vatican museums, and enjoy authentic Roman cooking classes in beautiful neighborhoods.', 'Family', 50, 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=480&q=60'),
(5, 'Golden Sands & Heritage', 'Goa, India', 25000.00, '4 Days / 3 Nights', 'Relax on the sun-kissed beaches of Goa. Enjoy vibrant nightlife, historic Portuguese architecture, and exquisite coastal seafood delicacies.', 'Luxury', 60, 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=480&q=60'),
(6, 'God''s Own Country Retreat', 'Kerala, India', 35000.00, '6 Days / 5 Nights', 'Cruise through the serene backwaters in a traditional houseboat, explore lush tea gardens in Munnar, and rejuvenate with authentic Ayurvedic spas.', 'Family', 40, 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=480&q=60'),
(7, 'Heaven on Earth Expedition', 'Kashmir, India', 45000.00, '7 Days / 6 Nights', 'Witness the breathtaking beauty of snow-capped peaks, take a Shikara ride on Dal Lake, and explore the enchanting valleys of Gulmarg and Phalgam.', 'Adventure', 35, 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=480&q=60'),
(8, 'Royal Desert Safari', 'Rajasthan, India', 30000.00, '5 Days / 4 Nights', 'Step into the land of Kings. Explore majestic forts in Jaipur, experience desert safaris in Jaisalmer, and witness the grandeur of Udaipur''s lakes.', 'Cultural', 50, 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=480&q=60');

-- 5. Insert Sample Bookings
INSERT INTO `bookings` (`id`, `booking_reference`, `customer_id`, `package_id`, `agent_id`, `travel_date`, `number_of_travelers`, `total_price`, `status`) VALUES
(4, 'TM-2026-004', 4, 5, 3, '2026-10-12', 4, 100000.00, 'confirmed'),
(5, 'TM-2026-005', 5, 6, 3, '2026-11-05', 2, 70000.00, 'pending'),
(6, 'TM-2026-006', 6, 7, 4, '2026-12-01', 2, 90000.00, 'confirmed'),
(7, 'TM-2026-007', 7, 8, 4, '2026-12-15', 5, 150000.00, 'confirmed'),
(8, 'TM-2026-008', 8, 5, 1, '2026-11-20', 3, 75000.00, 'confirmed');

-- 6. Insert Payments for Bookings (customer_id mapped perfectly)
INSERT INTO `payments` (`id`, `booking_id`, `customer_id`, `amount`, `payment_method`, `transaction_id`, `status`) VALUES
(4, 4, 4, 100000.00, 'UPI', 'TXN-492759102', 'completed'),
(5, 5, 5, 70000.00, 'Bank Transfer', 'TXN-391750293', 'pending'),
(6, 6, 6, 90000.00, 'Debit Card', 'TXN-104857293', 'completed'),
(7, 7, 7, 150000.00, 'UPI', 'TXN-847291048', 'completed'),
(8, 8, 8, 75000.00, 'Credit Card', 'TXN-492710384', 'completed');

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
