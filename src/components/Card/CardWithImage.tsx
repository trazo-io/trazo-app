// Chakra imports
import { Button, Flex, Icon, Text, useColorModeValue, Box } from '@chakra-ui/react';
import React, { useState } from 'react';

import { BsArrowRight } from 'react-icons/bs';
// Custom components
import Card from './Card';
import CardBody from './CardBody';
import CardHeader from './CardHeader';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import Shimmer from 'components/Shimmer/Shimmer';
import { EmptyImageState } from 'components/Design/EmptyImageState';

type CardWithImageProps = {
  title: string;
  name: string;
  image?: HTMLImageElement;
  readMoreLink: string;
  // Style props that should be forwarded to the Card component
  borderLeft?: string;
  borderColor?: string;
  boxShadow?: string;
  bgGradient?: string;
  _hover?: any;
  // Add other common Card props as needed
  description?: string;
  state?: string;
  city?: string;
  zone?: string;
  // When true, stretches to fill parent container height (e.g. CSS Grid row)
  fillHeight?: boolean;
};

const CardWithImage = ({
  title,
  name,
  image,
  readMoreLink,
  borderLeft,
  borderColor,
  boxShadow,
  bgGradient,
  _hover,
  description,
  state,
  city,
  zone,
  fillHeight = false,
  ...rest
}: CardWithImageProps) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [imageLoaded, setImageLoaded] = useState(false);

  const textColor = useColorModeValue('gray.700', 'white');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  /**
   * `description`, `city`, `state` and `zone` were declared, passed in by every call site, and
   * rendered NOWHERE — the farm-profile card printed its title, its name and a Read more link
   * over a blank 45% column (found 2026-08-15 while re-shooting the landing screenshot). The
   * props were already the contract; this only honours them.
   */
  const location = [city, zone, state].filter(Boolean).join(', ');

  /**
   * Declared once and rendered by BOTH layouts. It used to be two byte-identical copies, which
   * is the shape that lets a fix land on one breakpoint and quietly miss the other.
   *
   * `minH` is the 44px touch target from `.claude/rules/frontend.md` — the button is `p="0px"`
   * around a 14px label, so its natural hit area was ~20px tall, at the bottom edge of a card.
   *
   * ⚠️ Scoped to the mobile layout, which is the one the rule is about and the one that can
   * grow. MEASURED at 1440px: the desktop text column is 245px and its content already ended
   * at exactly 467px, its own bottom edge — zero slack — so the extra 24px pushed the link
   * 25px past a card that clips at 290.5px and cut the label in half. Above `xl` the pointer
   * is a mouse and the card height is fixed, so the target stays at its natural size.
   */
  const readMore = (
    <Flex align="center">
      <Button
        p="0px"
        minH={{ base: '44px', xl: 'auto' }}
        variant="no-hover"
        bg="transparent"
        onClick={() => navigate(readMoreLink)}>
        <Text
          fontSize="sm"
          color={textColor}
          fontWeight="bold"
          cursor="pointer"
          transition="all .5s ease"
          _hover={{ me: '4px' }}>
          {intl.formatMessage({ id: 'app.readMore' })}
        </Text>
        <Icon
          as={BsArrowRight}
          w="20px"
          h="20px"
          fontSize="2xl"
          transition="all .5s ease"
          mx=".3rem"
          cursor="pointer"
          pt="4px"
          _hover={{ transform: 'translateX(20%)' }}
        />
      </Button>
    </Flex>
  );

  /**
   * MEASURED at 1440px on `/farm/166/parcel/299`: unclamped, this pair rendered 153px of the
   * 213px the desktop text column has — a three-line location ("Tangent, Willamette Valley —
   * Calapooia River bottom, Linn County, OR") plus four description lines — which pushed the
   * Read more link 44px below the column and into the card's `overflow: hidden`. The link was
   * cut in half on a DESKTOP too, not only on the phone; it just took a long location string.
   *
   * The desktop column is 45% of the card and fixed at 290.5px, so it gets the shorter clamp.
   * A summary card whose entire job is "Read more" does not owe four lines.
   */
  const identity = (
    <>
      {location && (
        <Text fontSize="sm" color={mutedColor} fontWeight="400" mt={1} noOfLines={2}>
          {location}
        </Text>
      )}
      {description && (
        <Text
          fontSize="sm"
          color={mutedColor}
          lineHeight="1.6"
          mt={3}
          noOfLines={{ base: 4, xl: 2 }}>
          {description}
        </Text>
      )}
    </>
  );

  /**
   * The Read more link is the ONLY route to the profile page this card describes, and until
   * 2026-08-23 it was CLIPPED AWAY on a phone.
   *
   * The card locked `height` AND `maxHeight` to 220px at `base` while carrying
   * `overflow="hidden"`. MEASURED on the parcel dashboard at 430px, the mobile column needs
   * ~296px — 16px padding, a title, a name, a location line, a four-line description and the
   * link — so the last ~76px, the link included, was cut off. A farmer looking at
   * `/farm/:id/parcel/:id` had no way to reach `/parcel/:id/profile` at all; it reads as
   * broken navigation, which is exactly how it was reported.
   *
   * The lock only ever paid for the DESKTOP layout, which puts a `height="100%"` image beside
   * the text and so needs a definite height to resolve against. That layout starts at `xl`
   * (see the two `display` props below), so the height now starts at `xl` too. Below it the
   * card is content-sized with `minH` as a floor.
   */
  return (
    <Card
      minH={{ base: '220px', sm: '240px', md: '270px', lg: '290px' }}
      height={fillHeight ? '100%' : { base: 'auto', xl: '290.5px' }}
      maxHeight={fillHeight ? 'none' : { base: 'none', xl: '290.5px' }}
      p="0"
      overflow="hidden"
      className="trazo-card"
      {...rest}>
      {/* Mobile: Clean text-only layout */}
      <Flex display={{ base: 'flex', xl: 'none' }} direction="column" h="100%" w="100%">
        <Flex direction="column" p="16px" flex="1">
          {/* Header section with title and subtitle */}
          <Box mb={4} flex="1" minH={0} overflow="hidden">
            <Text fontSize="lg" color={textColor} fontWeight="bold" mb={1}>
              {title}
            </Text>
            <Text fontSize="sm" color="gray.500" fontWeight="400">
              {name}
            </Text>
            {identity}
          </Box>

          {/* Action button */}
          {readMore}
        </Flex>
      </Flex>

      {/* Desktop: Original side-by-side layout */}
      <Flex display={{ base: 'none', xl: 'flex' }} direction="row" h="100%" w="100%">
        <Flex direction="column" p="16px" width="45%">
          {/*
            `flex="1" minH={0} overflow="hidden"` is the STRUCTURAL half of the fix, and it is
            what the line clamps above lean on: whatever the copy turns out to be, the text
            block takes the leftover space and clips ITSELF, so the link underneath it can
            never be the thing pushed past the card. Counting lines alone only holds until
            someone writes a longer farm description.

            It also replaces the `<Spacer />` that used to sit here — a Spacer only pushes
            when there IS free space, and once the text overflowed there was none, so it
            collapsed to 0px and did nothing.
          */}
          <Box mb={4} flex="1" minH={0} overflow="hidden">
            <Text fontSize="lg" color={textColor} fontWeight="bold">
              {title}
            </Text>
            <Text fontSize="sm" color="gray.500" fontWeight="400">
              {name}
            </Text>
            {identity}
          </Box>
          {readMore}
        </Flex>
        <Box position="relative" width="55%" height="100%" overflow="hidden" borderRadius="15px">
          {!image ? (
            <EmptyImageState variant="medium" height="100%" borderRadius="15px" />
          ) : (
            <>
              {!imageLoaded && <Shimmer />}
              <Box
                position={!imageLoaded ? 'absolute' : 'relative'}
                top="0"
                left="0"
                width="100%"
                height="100%"
                opacity={imageLoaded ? 1 : 0}
                transition="opacity 0.3s ease-in-out">
                {React.cloneElement(image as React.ReactElement, {
                  onLoad: () => setImageLoaded(true)
                })}
              </Box>
            </>
          )}
        </Box>
      </Flex>
    </Card>
  );
};

export default CardWithImage;
