import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Icon } from "@workspace/ui/composed/icon";
import { useTranslation } from "react-i18next";
import { useGlobalStore } from "@/stores/global";
import { Logout } from "@/utils/common";

export function UserNav() {
  const { t } = useTranslation("auth");
  const { user } = useGlobalStore();

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-10 border bg-background p-1 hover:border-primary/30 hover:bg-accent"
            size="icon"
            variant="ghost"
          >
            <Avatar className="size-8">
              <AvatarImage alt={user?.avatar ?? ""} src={user?.avatar ?? ""} />
              <AvatarFallback className="bg-primary font-medium text-primary-foreground">
                {user?.auth_methods?.[0]?.auth_identifier
                  .toUpperCase()
                  .charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-2">
              <Avatar className="size-10">
                <AvatarImage
                  alt={user?.avatar ?? ""}
                  src={user?.avatar ?? ""}
                />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.auth_methods?.[0]?.auth_identifier
                    .toUpperCase()
                    .charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col space-y-1">
                <p className="truncate font-medium text-sm leading-none">
                  {user?.auth_methods?.[0]?.auth_identifier}
                </p>
                <p className="text-muted-foreground text-xs">Admin</p>
              </div>
              {/* <p className='text-xs leading-none text-muted-foreground'>ID: {user?.id}</p> */}
            </div>
          </DropdownMenuLabel>
          {/* <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Settings
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>New Team</DropdownMenuItem>
          </DropdownMenuGroup> */}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 py-2 text-destructive focus:text-destructive"
            onClick={Logout}
          >
            <Icon className="size-4 flex-none" icon="uil:exit" />
            <span className="grow">{t("logout", "Logout")}</span>
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
