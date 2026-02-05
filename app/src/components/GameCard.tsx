import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { GameInfo } from "../data/games";

type GameCardProps = {
  game: GameInfo;
  onSelect: (game: GameInfo) => void;
};

export const GameCard = ({ game, onSelect }: GameCardProps) => (
  <GameCardInner game={game} onSelect={onSelect} />
);

const GameCardInner = ({ game, onSelect }: GameCardProps) => {
  const { t } = useTranslation();

  const complexityLabel =
    game.complexity <= 2
      ? t("game_list.complexity_light")
      : game.complexity === 3
        ? t("game_list.complexity_medium")
        : t("game_list.complexity_heavy");

  const playtimeLabel = t("game_list.playtime_label", {
    min: game.playtime.min,
    max: game.playtime.max
  });

  const playerLabel = t("game_list.players_label", {
    min: game.minPlayers,
    max: game.maxPlayers
  });

  return (
  <Card
    sx={{
      borderRadius: "clamp(0.8rem, 1.5vw, 1rem)",
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      boxShadow: "0 0.4rem 1rem var(--color-shadow)"
    }}
  >
    <CardActionArea onClick={() => onSelect(game)}>
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.4rem, 0.8vw, 0.6rem)",
          padding: "clamp(0.8rem, 1.6vw, 1rem)"
        }}
      >
        <Box
          sx={{
            width: "100%",
            aspectRatio: "1 / 1",
            borderRadius: "0.8rem",
            overflow: "hidden",
            border: "1px solid var(--color-border)",
            background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0))"
          }}
        >
          {game.imageUrl ? (
            <Box
              component="img"
              src={game.imageUrl}
              alt={game.name}
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : null}
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {game.name}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
          {playerLabel}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
          {playtimeLabel}
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
          {complexityLabel}
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
  );
};
