import { Controller, Get, Headers } from '@nestjs/common';
import { parseLocale } from '../common/locale';

const CATALOG_ZH = [
  {
    type: 'ziwei',
    title: '紫微斗数',
    subtitle: '三合派排盘 · 个性化觉察',
    duration: '约 3 分钟',
    icon: 'star.circle',
    primary: true,
  },
];

const CATALOG_EN = [
  {
    type: 'ziwei',
    title: 'Zi Wei (Purple Star)',
    subtitle: 'San He chart · personal insights',
    duration: '~3 min',
    icon: 'star.circle',
    primary: true,
  },
];

@Controller('tests')
export class TestsController {
  @Get('catalog')
  catalog(@Headers('accept-language') acceptLanguage?: string) {
    const locale = parseLocale(acceptLanguage);
    return { items: locale === 'en' ? CATALOG_EN : CATALOG_ZH };
  }
}
