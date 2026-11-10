"use client";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import SearchIcon from "@mui/icons-material/Search";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import HelpArticleItem from "@/modules/help/components/HelpArticleItem/HelpArticleItem";
import {
  HELP_ARTICLES,
  HELP_CATEGORY_LABEL,
  HELP_CATEGORY_ORDER,
} from "@/modules/help/constants/helpArticles";
import { searchHelpArticles } from "@/modules/help/helpers/searchHelpArticles";
import type { HelpArticle, HelpCategory } from "@/modules/help/types/types";

export default function HelpPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory | "">("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isFiltering = query.trim() !== "" || category !== "";

  const results = useMemo(
    () => searchHelpArticles(HELP_ARTICLES, { query, category }),
    [query, category],
  );
  const popular = useMemo(() => HELP_ARTICLES.filter((article) => article.popular), []);

  const toggle = (instanceId: string) =>
    setExpandedId((current) => (current === instanceId ? null : instanceId));

  const renderItem = (article: HelpArticle, section: string, showCategory: boolean) => {
    const instanceId = `${section}-${article.id}`;
    return (
      <HelpArticleItem
        key={instanceId}
        article={article}
        instanceId={instanceId}
        expanded={expandedId === instanceId}
        onToggle={toggle}
        onNavigate={(path) => router.push(path)}
        companyId={companyId}
        showCategory={showCategory}
      />
    );
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <HelpOutlineIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Help &amp; Support
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Search for what you want to do, or pick a question below to see the answer.
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          label="Search help"
          placeholder="e.g. create a team, GitHub, mute notifications"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          inputProps={{ "aria-label": "Search help" }}
        />
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
          <Chip
            label="All topics"
            color={category === "" ? "primary" : "default"}
            variant={category === "" ? "filled" : "outlined"}
            onClick={() => setCategory("")}
          />
          {HELP_CATEGORY_ORDER.map((c) => (
            <Chip
              key={c}
              label={HELP_CATEGORY_LABEL[c]}
              color={category === c ? "primary" : "default"}
              variant={category === c ? "filled" : "outlined"}
              onClick={() => setCategory(category === c ? "" : c)}
            />
          ))}
        </Stack>
      </Paper>

      {isFiltering ? (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            {results.length} result{results.length !== 1 ? "s" : ""}
          </Typography>
          {results.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
              No help articles match your search. Try different words, such as the name of
              the page or button you are looking at.
            </Paper>
          ) : (
            results.map((article) => renderItem(article, "result", true))
          )}
        </Box>
      ) : (
        <>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Popular questions
          </Typography>
          <Box sx={{ mb: 4 }}>{popular.map((article) => renderItem(article, "popular", false))}</Box>

          {HELP_CATEGORY_ORDER.map((c) => {
            const inCategory = HELP_ARTICLES.filter((article) => article.category === c);
            if (inCategory.length === 0) return null;
            return (
              <Box key={c} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                  {HELP_CATEGORY_LABEL[c]}
                </Typography>
                {inCategory.map((article) => renderItem(article, c, false))}
              </Box>
            );
          })}
        </>
      )}
    </Box>
  );
}
