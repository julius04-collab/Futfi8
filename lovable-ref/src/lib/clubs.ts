export type Club = {
  id: string;
  name: string;
  short: string;
  abbr: string;
  primary: string;
  secondary: string;
  city: string;
};

export const CLUBS: Club[] = [
  { id: "ars", name: "Arsenal", short: "Arsenal", abbr: "ARS", primary: "#EF0107", secondary: "#063672", city: "London" },
  { id: "avl", name: "Aston Villa", short: "Villa", abbr: "AVL", primary: "#95BFE5", secondary: "#670E36", city: "Birmingham" },
  { id: "bou", name: "Bournemouth", short: "Cherries", abbr: "BOU", primary: "#DA291C", secondary: "#000000", city: "Bournemouth" },
  { id: "bre", name: "Brentford", short: "Bees", abbr: "BRE", primary: "#E30613", secondary: "#FBB800", city: "London" },
  { id: "bha", name: "Brighton", short: "Seagulls", abbr: "BHA", primary: "#0057B8", secondary: "#FFCD00", city: "Brighton" },
  { id: "bur", name: "Burnley", short: "Clarets", abbr: "BUR", primary: "#6C1D45", secondary: "#99D6EA", city: "Burnley" },
  { id: "che", name: "Chelsea", short: "Chelsea", abbr: "CHE", primary: "#034694", secondary: "#DBA111", city: "London" },
  { id: "cry", name: "Crystal Palace", short: "Palace", abbr: "CRY", primary: "#1B458F", secondary: "#C4122E", city: "London" },
  { id: "eve", name: "Everton", short: "Toffees", abbr: "EVE", primary: "#003399", secondary: "#FFFFFF", city: "Liverpool" },
  { id: "ful", name: "Fulham", short: "Cottagers", abbr: "FUL", primary: "#000000", secondary: "#CC0000", city: "London" },
  { id: "lee", name: "Leeds", short: "Leeds", abbr: "LEE", primary: "#FFCD00", secondary: "#1D428A", city: "Leeds" },
  { id: "liv", name: "Liverpool", short: "Reds", abbr: "LIV", primary: "#C8102E", secondary: "#00B2A9", city: "Liverpool" },
  { id: "mci", name: "Man City", short: "City", abbr: "MCI", primary: "#6CABDD", secondary: "#1C2C5B", city: "Manchester" },
  { id: "mun", name: "Man United", short: "United", abbr: "MUN", primary: "#DA291C", secondary: "#FBE122", city: "Manchester" },
  { id: "new", name: "Newcastle", short: "Magpies", abbr: "NEW", primary: "#241F20", secondary: "#F1F1F1", city: "Newcastle" },
  { id: "nfo", name: "Nott'm Forest", short: "Forest", abbr: "NFO", primary: "#DD0000", secondary: "#FFFFFF", city: "Nottingham" },
  { id: "sun", name: "Sunderland", short: "Black Cats", abbr: "SUN", primary: "#EB172B", secondary: "#211E1F", city: "Sunderland" },
  { id: "tot", name: "Tottenham", short: "Spurs", abbr: "TOT", primary: "#132257", secondary: "#FFFFFF", city: "London" },
  { id: "whu", name: "West Ham", short: "Hammers", abbr: "WHU", primary: "#7A263A", secondary: "#1BB1E7", city: "London" },
  { id: "wol", name: "Wolves", short: "Wolves", abbr: "WOL", primary: "#FDB913", secondary: "#231F20", city: "Wolverhampton" },
];
