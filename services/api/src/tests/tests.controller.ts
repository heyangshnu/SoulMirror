import { Controller, Get } from '@nestjs/common';

const CATALOG = [
  {
    type: 'ziwei',
    title: '紫微斗数',
    subtitle: '三合派排盘 · 个性化觉察',
    duration: '约 3 分钟',
    icon: 'star.circle',
    primary: true,
  },
];

@Controller('tests')
export class TestsController {
  @Get('catalog')
  catalog() {
    return { items: CATALOG };
  }
}
