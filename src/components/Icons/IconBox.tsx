import { Flex } from '@chakra-ui/react';

type IconBoxProps = {
  children: React.ReactNode;
};

export default function IconBox(props: IconBoxProps) {
  const { children, ...rest } = props;

  return (
    <Flex alignItems={'center'} justifyContent={'center'} borderRadius={'12px'} {...rest}>
      {children}
    </Flex>
  );
}
