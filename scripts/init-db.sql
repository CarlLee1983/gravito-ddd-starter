-- PostgreSQL 初始化腳本
-- 為 gravito-ddd 應用準備數據庫

-- 確保資料庫存在
CREATE DATABASE IF NOT EXISTS gravito_ddd;

-- 連接到目標資料庫
\c gravito_ddd;

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 創建基本表（如果 ORM 遷移未處理）
-- 注：通常應由 ORM 遷移程式建立表，此處為備用

-- 設置默認時區
SET timezone = 'UTC';

-- 記錄初始化完成
SELECT 'PostgreSQL 初始化完成！' AS init_status;
