/**
 * @file types/index.d.ts
 * @description 應用層級類型聲明的彙總入點
 *
 * 組織方式：
 * - framework/ - 第三方框架的類型聲明
 * - application/ - 應用層共享類型 (API、Domain、DTO)
 * - frontend/ - 前端組件和上下文類型
 * - global.d.ts - 全局環境變數和全局類型
 */

// ============================================================================
// Framework Type Declarations
// ============================================================================

/// <reference path="./framework/gravito-plasma.d.ts" />
// TODO: 新增其他 @gravito/* 包的類型聲明
// /// <reference path="./framework/gravito-core.d.ts" />
// /// <reference path="./framework/gravito-atlas.d.ts" />

// ============================================================================
// Application Type Declarations
// ============================================================================

/// <reference path="./application/api.d.ts" />
/// <reference path="./application/domain.d.ts" />
// TODO: 新增特定功能模組的類型聲明
// /// <reference path="./application/features.d.ts" />

// ============================================================================
// Frontend Type Declarations
// ============================================================================

/// <reference path="./frontend/components.d.ts" />
/// <reference path="./frontend/contexts.d.ts" />
// TODO: 新增前端頁面組件的類型聲明
// /// <reference path="./frontend/pages.d.ts" />

// ============================================================================
// Global Type Declarations
// ============================================================================

/// <reference path="./global.d.ts" />

export {}
