import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Button,
  Center,
  CircularProgress,
  HStack,
  Text,
  UnorderedList,
  OrderedList,
  ListItem,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { StandardPage, StandardSearchInput } from 'components/Design/StandardComponents';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import { useGetFarmerQuestionsQuery, FarmerQuestionAnswer } from 'store/api/educationApi';

/**
 * FAQ answers are seeded as markdown-lite (paragraphs, "- " bullets, **bold**).
 * Until 2026-08-09 they rendered as raw text — literal asterisks on screen.
 * This renderer covers exactly the three constructs the seeds use; anything
 * fancier belongs in an education topic, not an FAQ answer.
 */
const renderBold = (text: string): React.ReactNode[] =>
  text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <Text as="span" key={i} fontWeight="semibold" color="inherit">
        {part}
      </Text>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );

const AnswerBody: React.FC<{ answer: string }> = ({ answer }) => {
  const blocks = answer.split(/\n\s*\n/);
  return (
    <VStack align="stretch" spacing={3}>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim().length > 0);
        // A block may mix prose and "- " items (e.g. a "**Header:**" line followed
        // by bullets). Group consecutive lines into text runs and list runs so the
        // bullets always render as a real list, never as inline dashes.
        type Kind = 'text' | 'bullet' | 'numbered';
        const kindOf = (line: string): Kind =>
          /^- /.test(line) ? 'bullet' : /^\d+\.\s/.test(line) ? 'numbered' : 'text';
        const runs: { kind: Kind; lines: string[] }[] = [];
        lines.forEach((raw) => {
          const line = raw.trim();
          const kind = kindOf(line);
          const last = runs[runs.length - 1];
          if (last && last.kind === kind) last.lines.push(line);
          else runs.push({ kind, lines: [line] });
        });
        return (
          <VStack key={bi} align="stretch" spacing={2}>
            {runs.map((run, ri) => {
              if (run.kind === 'text') {
                return (
                  <Text key={ri} fontSize="sm" lineHeight="1.7">
                    {renderBold(run.lines.join(' '))}
                  </Text>
                );
              }
              const List = run.kind === 'bullet' ? UnorderedList : OrderedList;
              return (
                <List key={ri} spacing={1.5} pl={1}>
                  {run.lines.map((line, li) => (
                    <ListItem key={li} fontSize="sm" lineHeight="1.7">
                      {renderBold(line.replace(/^- /, '').replace(/^\d+\.\s/, ''))}
                    </ListItem>
                  ))}
                </List>
              );
            })}
          </VStack>
        );
      })}
    </VStack>
  );
};

/** Display labels for FarmerQuestionAnswer.category values (backend content is EN-only;
 *  the chip labels ride the catalogs so at least the chrome is bilingual). */
const CATEGORY_LABEL_IDS: Record<string, string> = {
  records: 'education.faqCategory.records',
  quick_add: 'education.faqCategory.quickAdd',
  osp_renewal: 'education.faqCategory.ospRenewal',
  consumer_page: 'education.faqCategory.consumerPage',
  setup: 'education.faqCategory.setup'
};

const EducationFAQ: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const mutedFg = useColorModeValue('gray.600', 'gray.400');
  const panelFg = useColorModeValue('gray.700', 'gray.300');
  const dividerColor = useColorModeValue('gray.100', 'gray.700');
  const hoverBg = useColorModeValue('green.50', 'whiteAlpha.100');

  // The backend list endpoint ignores filter params, so filtering is client-side
  // by design: one fetch, instant chips and search.
  const { data: allFAQs = [], isLoading, error } = useGetFarmerQuestionsQuery({});

  const categories = useMemo(
    () => Array.from(new Set(allFAQs.map((f) => f.category))).filter((c) => CATEGORY_LABEL_IDS[c]),
    [allFAQs]
  );

  const visibleFAQs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allFAQs
      .filter((f) => (selectedCategory ? f.category === selectedCategory : true))
      .filter((f) =>
        q ? f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q) : true
      )
      .slice()
      .sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  }, [allFAQs, searchQuery, selectedCategory]);

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'education.faqPageTitle' })}
      description={intl.formatMessage({ id: 'education.faqPageDescription' })}
      showBackButton
      backLabel={intl.formatMessage(
        { id: 'common.backTo' },
        { place: intl.formatMessage({ id: 'education.pageTitle' }) }
      )}
      onBack={() => navigate('/admin/dashboard/education')}
      // Frame owns the width, so the hero sits on the same column as the content (the
      // VStack used to centre itself while the hero ran full width).
      contentMaxW="3xl">
      <VStack spacing={5} w="full" align="stretch">
        {isLoading ? (
          <Center py={16}>
            <CircularProgress isIndeterminate color="green.700" />
          </Center>
        ) : error ? (
          <Card bg={cardBg}>
            <CardBody py={10} textAlign="center">
              <Text fontWeight="semibold" mb={1}>
                {intl.formatMessage({ id: 'education.faqErrorTitle' })}
              </Text>
              <Text fontSize="sm" color={mutedFg}>
                {intl.formatMessage({ id: 'education.faqErrorDescription' })}
              </Text>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Search + category chips */}
            <VStack spacing={3} align="stretch">
              <StandardSearchInput
                placeholder={intl.formatMessage({ id: 'education.faqSearchPlaceholder' })}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
              />
              <HStack spacing={2} flexWrap="wrap">
                <Button
                  size="sm"
                  minH="44px"
                  borderRadius="full"
                  variant={selectedCategory === null ? 'solid' : 'outline'}
                  colorScheme="green"
                  onClick={() => setSelectedCategory(null)}>
                  {intl.formatMessage({ id: 'education.faqAllCategories' })}
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    minH="44px"
                    borderRadius="full"
                    variant={selectedCategory === cat ? 'solid' : 'outline'}
                    colorScheme="green"
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}>
                    {intl.formatMessage({ id: CATEGORY_LABEL_IDS[cat] })}
                  </Button>
                ))}
              </HStack>
            </VStack>

            {/* FAQ accordion */}
            {visibleFAQs.length > 0 ? (
              <Card bg={cardBg} p={0} overflow="hidden">
                <Accordion allowMultiple>
                  {visibleFAQs.map((faq: FarmerQuestionAnswer) => (
                    <AccordionItem
                      key={faq.id}
                      border="none"
                      borderBottomWidth="1px"
                      borderBottomColor={dividerColor}
                      _last={{ borderBottomWidth: 0 }}>
                      <AccordionButton px={{ base: 4, md: 6 }} py={4} _hover={{ bg: hoverBg }}>
                        <HStack flex={1} spacing={3} align="flex-start" textAlign="left">
                          <Text fontWeight="semibold" fontSize="sm" flex={1}>
                            {faq.question}
                          </Text>
                          {faq.is_featured && (
                            <Badge colorScheme="green" variant="subtle" flexShrink={0}>
                              {intl.formatMessage({ id: 'education.faqFeatured' })}
                            </Badge>
                          )}
                        </HStack>
                        <AccordionIcon color="green.700" ml={2} />
                      </AccordionButton>
                      <AccordionPanel px={{ base: 4, md: 6 }} pb={5} color={panelFg}>
                        <AnswerBody answer={faq.answer} />
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            ) : (
              <Card bg={cardBg}>
                <CardBody py={12} textAlign="center">
                  <Text fontWeight="semibold" mb={1}>
                    {intl.formatMessage({ id: 'education.faqNoQuestionsFound' })}
                  </Text>
                  <Text fontSize="sm" color={mutedFg} mb={4}>
                    {intl.formatMessage({ id: 'education.faqNoQuestionsDescription' })}
                  </Text>
                  <Button
                    variant="outline"
                    colorScheme="green"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                    }}>
                    {intl.formatMessage({ id: 'education.faqClearSearch' })}
                  </Button>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </VStack>
    </StandardPage>
  );
};

export default EducationFAQ;
