import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Mermaid } from '@/components/Mermaid';

export const baseMdxComponents = {
  ...defaultMdxComponents,
  Mermaid,
  Step,
  Steps,
  Tab,
  Tabs,
  Accordion,
  Accordions,
};
