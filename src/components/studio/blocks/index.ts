// Component map passed to MDX <Content /> on modular project pages.
// Usage in a project .mdx body:
//
//   import swirl from '../../assets/studio/sample/sample-09.png';
//   <Image src={swirl} preset="offset-right" />
//   <Quote>the pattern was painted until it hummed</Quote>
import Image from './Image.astro';
import ImagePair from './ImagePair.astro';
import Gallery from './Gallery.astro';
import Quote from './Quote.astro';
import Text from './Text.astro';

export const studioBlocks = { Image, ImagePair, Gallery, Quote, Text };
