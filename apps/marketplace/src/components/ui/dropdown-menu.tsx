"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  sideOffset?: number
}

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {}

interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

interface DropdownMenuSeparatorProps extends React.HTMLAttributes<HTMLHRElement> {}

const DropdownMenuContext = React.createContext<{
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerRef: React.RefObject<HTMLButtonElement | null>
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
})

function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

function DropdownMenuTrigger({ className, children, ...props }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef } = React.useContext(DropdownMenuContext)
  return (
    <button
      ref={triggerRef}
      className={cn("inline-flex items-center gap-1", className)}
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      {...props}
    >
      {children}
    </button>
  )
}

function DropdownMenuContent({ className, align = "start", children, ...props }: DropdownMenuContentProps) {
  const { open } = React.useContext(DropdownMenuContext)
  if (!open) return null

  return (
    <div
      className={cn(
        "absolute top-full z-50 mt-2 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        align === "end" && "right-0",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuItem({ className, children, ...props }: DropdownMenuItemProps) {
  const { setOpen } = React.useContext(DropdownMenuContext)
  return (
    <div
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={() => setOpen(false)}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuLabel({ className, children, ...props }: DropdownMenuLabelProps) {
  return (
    <div
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuSeparator({ className, ...props }: DropdownMenuSeparatorProps) {
  return <hr className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}
