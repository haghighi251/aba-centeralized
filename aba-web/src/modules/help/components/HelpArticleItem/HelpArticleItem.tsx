"use client";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { HelpArticle, HelpBlock } from "@/modules/help/types/types";
import { HELP_CATEGORY_LABEL } from "@/modules/help/constants/helpArticles";

interface HelpArticleItemProps {
  article: HelpArticle;
  /** Distinguishes the same article when it is rendered in more than one section. */
  instanceId: string;
  expanded: boolean;
  onToggle: (instanceId: string) => void;
  onNavigate: (path: string) => void;
  companyId: string;
  showCategory?: boolean;
}

function renderBlock(block: HelpBlock, index: number) {
  switch (block.type) {
    case "paragraph":
      return (
        <Typography key={index} variant="body2" sx={{ mb: 1.5 }}>
          {block.text}
        </Typography>
      );
    case "steps":
      return (
        <Box key={index} component="ol" sx={{ pl: 3, mt: 0, mb: 1.5 }}>
          {block.items.map((item) => (
            <Typography key={item} component="li" variant="body2" sx={{ mb: 0.5 }}>
              {item}
            </Typography>
          ))}
        </Box>
      );
    case "list":
      return (
        <Box key={index} component="ul" sx={{ pl: 3, mt: 0, mb: 1.5 }}>
          {block.items.map((item) => (
            <Typography key={item} component="li" variant="body2" sx={{ mb: 0.5 }}>
              {item}
            </Typography>
          ))}
        </Box>
      );
    case "note":
      return (
        <Alert key={index} severity="info" sx={{ mb: 1.5 }}>
          {block.text}
        </Alert>
      );
    default:
      return null;
  }
}

export default function HelpArticleItem({
  article,
  instanceId,
  expanded,
  onToggle,
  onNavigate,
  companyId,
  showCategory = false,
}: HelpArticleItemProps) {
  const linkPath = article.link
    ? article.link.absolute
      ? article.link.path
      : `/company/${companyId}${article.link.path}`
    : null;

  return (
    <Accordion
      expanded={expanded}
      onChange={() => onToggle(instanceId)}
      disableGutters
      data-testid={`help-article-${instanceId}`}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${instanceId}-content`} id={`${instanceId}-header`}>
        <Box>
          <Typography variant="body1" fontWeight={600}>
            {article.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {article.description}
          </Typography>
          {showCategory && (
            <Chip
              label={HELP_CATEGORY_LABEL[article.category]}
              size="small"
              variant="outlined"
              sx={{ mt: 0.75 }}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails id={`${instanceId}-content`}>
        {article.blocks.map(renderBlock)}
        {article.link && linkPath !== null && (
          <Button size="small" variant="outlined" onClick={() => onNavigate(linkPath)}>
            {article.link.label}
          </Button>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
