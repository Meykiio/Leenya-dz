const AVATAR_COLORS = [
  "#E6F7F1", "#E5EDFF", "#FDF1D8", "#FDE8E2",
  "#E7ECF5", "#E4F5F7", "#FDF3DC", "#ECEEF3",
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
