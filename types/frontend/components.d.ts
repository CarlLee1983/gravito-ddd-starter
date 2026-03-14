/**
 * @file types/frontend/components.d.ts
 * @description React 組件的共享類型定義
 *
 * 包含：
 * - 通用組件 Props
 * - 組件變體型別
 */

import React from 'react'

// ============================================================================
// Common Component Props
// ============================================================================

/**
 * 按鈕組件 Props
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  fullWidth?: boolean
}

/**
 * 表單欄位 Props
 */
interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea'
  required?: boolean
  disabled?: boolean
  error?: string
  placeholder?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

/**
 * 卡片組件 Props
 */
interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
  elevated?: boolean
}

/**
 * 對話框 Props
 */
interface DialogProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children?: React.ReactNode
  actions?: React.ReactNode
}

// ============================================================================
// Common Component Variants
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'
type FormFieldType = 'text' | 'email' | 'password' | 'number' | 'textarea'

export {}
