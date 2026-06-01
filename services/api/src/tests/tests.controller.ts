import { Controller, Get } from '@nestjs/common';

const CATALOG = [
  {
    type: 'bazi',
    title: '八字命盘',
    subtitle: '传统命理 × 现代心理',
    duration: '约 5 分钟',
    icon: 'moon.stars',
  },
  {
    type: 'mbti',
    title: 'MBTI 人格',
    subtitle: '28 题精简版',
    duration: '约 8 分钟',
    icon: 'brain',
  },
  {
    type: 'tarot',
    title: '塔罗占卜',
    subtitle: '三牌阵解读',
    duration: '约 3 分钟',
    icon: 'sparkles',
  },
  {
    type: 'palm',
    title: '手相分析',
    subtitle: '掌纹 AI 解读',
    duration: '约 4 分钟',
    icon: 'hand.raised',
  },
];

@Controller('tests')
export class TestsController {
  @Get('catalog')
  catalog() {
    return { items: CATALOG };
  }
}
