"use client"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Theme specimen only: lets the overlays be opened and inspected in both modes.
export function OverlaySamples() {
  return (
    <div className="flex flex-wrap gap-2">
      <Dialog>
        <DialogTrigger render={<Button />}>Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Name is required. Company and phone are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Input placeholder="Full name" aria-label="Full name" />
            <Input placeholder="Company" aria-label="Company" />
          </div>
          <DialogFooter showCloseButton>
            <Button>Save lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="secondary" />}>
          Modal
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this note?</AlertDialogTitle>
            <AlertDialogDescription>
              The note has not been saved. Discarding it cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogCancel variant="destructive">Discard</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Drawer swipeDirection="right">
        <DrawerTrigger render={<Button variant="secondary" />}>
          Drawer (side)
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Priya Sharma</DrawerTitle>
            <DrawerDescription>Example Traders</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2 px-4">
            {["Sent pricing PDF.", "Intro call, keen on a demo."].map(
              (note) => (
                <p key={note} className="rounded-md bg-muted px-4 py-3">
                  {note}
                </p>
              )
            )}
          </div>
          <DrawerFooter>
            <Button>Add note</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer>
        <DrawerTrigger render={<Button variant="secondary" />}>
          Drawer (bottom)
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Today&apos;s Follow-ups</DrawerTitle>
            <DrawerDescription>3 leads scheduled for today</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button>Open list</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>
          Tooltip
        </TooltipTrigger>
        <TooltipContent>Follow-up at 2:00 pm</TooltipContent>
      </Tooltip>
    </div>
  )
}
