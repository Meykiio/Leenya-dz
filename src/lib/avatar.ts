const AVATAR_COLORS = [
  "#E8F5E9", "#E3F2FD", "#FFF3E0", "#FCE4EC",
  "#F3E5F5", "#E0F7FA", "#FFF8E1", "#EFEBE9",
];

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
