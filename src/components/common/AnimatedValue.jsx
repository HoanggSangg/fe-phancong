import { Box, keyframes } from '@mui/material';

export const valueEnter = keyframes`
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

export const listEnter = keyframes`
  0% {
    opacity: 0;
    transform: translateY(14px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const pageEnter = keyframes`
  0% {
    opacity: 0;
    transform: translateY(18px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const authCardEnter = keyframes`
  0% {
    opacity: 0;
    transform: translateY(28px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

export const softPulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.72; }
`;

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const STAGGER_DELAYS = ['0ms', '70ms', '130ms', '190ms', '240ms'];

/** Full page content entrance on route change + stagger top-level sections. */
export function PageContent({ animationKey, children, sx }) {
  const staggerRules = STAGGER_DELAYS.reduce((acc, delay, index) => {
    acc[`& > *:nth-of-type(${index + 1})`] = {
      animation: `${listEnter} 0.46s ${EASE} both`,
      animationDelay: delay,
    };
    return acc;
  }, {});

  staggerRules['& > *:nth-of-type(n+6)'] = {
    animation: `${listEnter} 0.46s ${EASE} both`,
    animationDelay: '280ms',
  };

  return (
    <Box
      key={animationKey}
      sx={{
        animation: `${pageEnter} 0.48s ${EASE} both`,
        ...staggerRules,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Login / register card entrance. */
export function AuthPageShell({ children, sx }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 440,
        animation: `${authCardEnter} 0.55s ${EASE} both`,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Re-mount animation when animationKey changes (e.g. revenue base switch). */
export function AnimatedValue({ animationKey, children, component = 'span', sx }) {
  return (
    <Box
      key={animationKey}
      component={component}
      sx={{
        display: 'inline-block',
        animation: `${valueEnter} 0.42s ${EASE} both`,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Staggered entrance for list blocks. */
export function AnimatedListItem({ index = 0, children, sx }) {
  return (
    <Box
      sx={{
        animation: `${listEnter} 0.48s ${EASE} both`,
        animationDelay: `${Math.min(index * 65, 450)}ms`,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Hover lift for cards / papers. */
export const hoverLiftSx = {
  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: 2,
  },
};
