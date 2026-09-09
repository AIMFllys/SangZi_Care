import type { Section } from '@/lib/types/questionnaire';

export function sectionsForSex(
  sections: Section[],
  sex: 'male' | 'female',
): Section[] {
  return sections.filter((section) => !section.gender || section.gender === sex);
}

/** 与 Elderstech-Questionnaire 题目、选项、权重保持同步 */
export const QUESTIONNAIRE_SECTIONS: Section[] = [
  {
    id: 'base',
    title: '基础信息 & 家庭关怀',
    questions: [
      { id: 'q1', type: 'radio', label: '1. 您的年龄段是？', options: ['18-30岁', '31-45岁', '46-60岁', '60岁以上'] },
      { id: 'q2', type: 'radio', label: '2. 家中重点关照的长辈居住状态？', options: ['与您同住', '夫妻老两口单独居住(空巢)', '独居', '居住在养老院/护理机构'] },
      { id: 'q3', type: 'radio', label: '3. 您与长辈见面的频率？', options: ['每天', '每周1-2次', '每月1-2次', '每半年或更少'] },
      { id: 'q4', type: 'checkbox', label: '4. 日常交流最常涉及的话题？（多选）', options: ['日常生活与饮食起居', '身体状况与疾病管理', '心理情绪与烦心事倾听', '社会新闻与家庭琐事'] },
      { id: 'q5', type: 'radio', label: '5. 长辈最依赖您的帮助是？（单选）', options: ['经济支持', '情感寄托', '就医陪护', '生活照料'] },
    ],
  },
  {
    id: 'lung',
    title: '肺部健康测试 (肺癌风险)',
    questions: [
      { id: 'l1', type: 'radio', label: '1. 您的年纪？', options: ['50岁以下', '50岁到74岁', '75岁以上'], weight: 0.05 },
      { id: 'l2', type: 'radio', label: '2. 您这辈子抽烟的情况？', options: ['从不抽烟或戒了十几年', '以前抽，最近几年才戒', '现在还在抽，一天至少半包'], weight: 0.3 },
      { id: 'l3', type: 'radio', label: '3. 经常闻到二手烟吗？', options: ['很少', '偶尔去棋牌室能闻到', '家里人就抽烟，常吸二手烟'], weight: 0.1 },
      { id: 'l4', type: 'radio', label: '4. 厨房油烟大不大？', options: ['每次开抽油烟机，干净', '偶尔炒菜有点呛', '舍不得开油烟机或以前烧柴火'], weight: 0.1 },
      { id: 'l5', type: 'radio', label: '5. 年轻时干过粉尘大的活儿吗？', options: ['没有，工作环境正常', '短暂干过几个月', '干过一年以上，如矿上、化工厂'], weight: 0.05 },
      { id: 'l6', type: 'radio', label: '6. 直系亲属有人得过肺部肿瘤吗？', options: ['没听说过', '有远房亲戚得过', '有，亲生父母或亲兄弟姐妹'], weight: 0.15 },
      { id: 'l7', type: 'radio', label: '7. 医生说过您有老慢支、肺气肿吗？', options: ['肺挺好，没这些病', '以前得过肺结核已治好', '医生说有慢阻肺或常年老支气管炎'], weight: 0.1 },
      { id: 'l8', type: 'radio', label: '8. 最近半年，嗓子或气管不对劲吗？', options: ['挺通畅的', '换季偶尔咳嗽', '经常干咳、咳半个月不好或痰中带血'], weight: 0.15 },
    ],
  },
  {
    id: 'gut',
    title: '肠胃健康测试 (胃肠肿瘤风险)',
    questions: [
      { id: 'g1', type: 'radio', label: '1. 您的年纪？', options: ['45岁以下', '45岁及以上'], weight: 0.05 },
      { id: 'g2', type: 'radio', label: '2. 平时胃口怎样？有反酸腹胀吗？', options: ['吃嘛嘛香，或幽门螺杆菌已治', '偶尔不舒服', '有老胃病或幽门螺杆菌未管'], weight: 0.2 },
      { id: 'g3', type: 'radio', label: '3. 肠镜检查有过"息肉"吗？', options: ['没有或没做过', '长过普通息肉已切除', '腺瘤性息肉或老肠炎'], weight: 0.2 },
      { id: 'g4', type: 'radio', label: '4. 剩饭剩菜怎么处理？', options: ['基本当顿吃完', '放冰箱第二天热热吃', '经常吃热好几顿的剩菜'], weight: 0.15 },
      { id: 'g5', type: 'radio', label: '5. 口味偏好和吃肉习惯？', options: ['喜欢吃鱼肉鸡肉，口味清淡', '正常吃猪肉牛肉，不挑食', '爱吃腌咸菜腊肉，极少吃青菜'], weight: 0.05 },
      { id: 'g6', type: 'radio', label: '6. 直系亲属有人得过肠癌或胃癌吗？', options: ['没有', '有人在60岁以后得过', '有人得过且发现时不到50岁'], weight: 0.15 },
      { id: 'g7', type: 'radio', label: '7. 体型和抽烟喝酒情况？', options: ['体重正常，不抽烟少喝酒', '稍微有点胖', '肚子特别大，长期抽烟喝酒'], weight: 0.05 },
      { id: 'g8', type: 'radio', label: '8. 最近几个月，大便规律吗？', options: ['挺规律的', '老毛病偶尔便秘', '拉肚子便秘交替，或大便发黑、体重下降'], weight: 0.15 },
    ],
  },
  {
    id: 'liver',
    title: '肝脏健康测试 (肝癌风险)',
    questions: [
      { id: 'h1', type: 'radio', label: '1. 年纪和性别？', options: ['女同志或40岁以下男', '40岁及以上男同志'], weight: 0.05 },
      { id: 'h2', type: 'radio', label: '2. 有"大三阳"、"小三阳"或肝炎吗？', options: ['没有或打过疫苗', '有过但按时吃药控制', '查出过但没当回事没复查'], weight: 0.25 },
      { id: 'h3', type: 'radio', label: '3. 有肝硬化或肝损伤吗？', options: ['肝脏彩超挺好', '轻微肝损伤', '明确肝硬化'], weight: 0.1 },
      { id: 'h4', type: 'radio', label: '4. 平时爱喝两口酒吗？', options: ['滴酒不沾或早戒了', '偶尔逢年过节喝一两杯', '几乎天天喝，一喝半斤八两'], weight: 0.15 },
      { id: 'h5', type: 'radio', label: '5. 发霉的案板筷子或发苦花生怎么处理？', options: ['马上扔掉，案板筷子常换', '洗洗刷刷接着用', '舍不得扔，切掉发霉部分继续吃'], weight: 0.15 },
      { id: 'h6', type: 'radio', label: '6. 直系亲属有人得过肝部肿瘤吗？', options: ['没听说过', '有远房亲戚得过', '有，且他们可能也有乙肝'], weight: 0.1 },
      { id: 'h7', type: 'radio', label: '7. 血糖高吗？有脂肪肝吗？', options: ['血糖正常，没有脂肪肝', '轻度脂肪肝或血糖偏高', '重度脂肪肝或糖尿病严重'], weight: 0.05 },
      { id: 'h8', type: 'radio', label: '8. 最近右边肋骨下面隐隐作痛？', options: ['没有，都挺好', '偶尔觉得累，休息就好', '经常胀痛，或眼白发黄、皮肤发黄'], weight: 0.15 },
    ],
  },
  {
    id: 'female',
    title: '女性专属健康 (乳腺/妇科)',
    gender: 'female',
    questions: [
      { id: 'f1', type: 'radio', label: '1. 您的年纪？', options: ['40岁以下', '55岁以上', '40-55岁之间'], weight: 0.05 },
      { id: 'f2', type: 'radio', label: '2. 直系亲属有乳腺或卵巢肿瘤吗？', options: ['没听说过', '远房亲戚有', '亲妈、亲姐妹或女儿有'], weight: 0.25 },
      { id: 'f3', type: 'radio', label: '3. 月经和生育情况？', options: ['正常生娃且母乳喂养', '未生育或30岁后生头胎', '月经早于12岁或绝经晚于55岁'], weight: 0.15 },
      { id: 'f4', type: 'radio', label: '4. 以前查出过乳腺结节吗？', options: ['没有或普通轻微增生', '长过普通纤维瘤', '医生说是不典型增生'], weight: 0.2 },
      { id: 'f5', type: 'radio', label: '5. 吃过含激素的药或保健品吗？', options: ['从来没吃过', '年轻时短暂吃过避孕药', '绝经后长期吃过含雌激素的药'], weight: 0.1 },
      { id: 'f6', type: 'radio', label: '6. 绝经后体重变化大吗？', options: ['体重保持好，经常散步', '稍微胖了一点，不爱动', '绝经后胖得厉害，还抽烟喝酒'], weight: 0.05 },
      { id: 'f7', type: 'radio', label: '7. 平时心情和脾气怎么样？', options: ['乐呵呵的，睡得香', '偶尔烦心事会焦虑失眠', '脾气急，常年生闷气或受过精神打击'], weight: 0.05 },
      { id: 'f8', type: 'radio', label: '8. 最近乳房有什么不对劲吗？', options: ['软软的，没啥硬块', '月经前后稍微胀痛', '摸到不疼但硬的肿块，或乳头有血水'], weight: 0.15 },
    ],
  },
  {
    id: 'male',
    title: '男性专属健康 (前列腺)',
    gender: 'male',
    questions: [
      { id: 'm1', type: 'radio', label: '1. 您的年纪？', options: ['50岁以下', '50-65岁', '65岁以上'], weight: 0.15 },
      { id: 'm2', type: 'radio', label: '2. 亲爹或亲兄弟有前列腺肿瘤吗？', options: ['没听说过', '有远房亲戚有', '亲爹或亲兄弟有'], weight: 0.2 },
      { id: 'm3', type: 'radio', label: '3. 平时饮食偏好？', options: ['常吃西红柿、豆腐青菜', '荤素搭配', '无肉不欢，油炸肥肉'], weight: 0.15 },
      { id: 'm4', type: 'radio', label: '4. 以前有前列腺毛病吗？', options: ['挺好，没啥毛病', '前列腺肥大/增生', '常年治不好的老前列腺炎'], weight: 0.1 },
      { id: 'm5', type: 'radio', label: '5. 体型和生活习惯？', options: ['挺苗条，经常溜达锻炼', '比较懒，天天坐着看电视', '肚子大，长期抽烟，喜欢憋尿'], weight: 0.05 },
      { id: 'm6', type: 'radio', label: '6. 现在尿尿还痛快吗？', options: ['挺痛快的', '偶尔尿频，晚上起夜一两次', '尿不尽、滴滴答答，或一晚上起夜四五次'], weight: 0.15 },
      { id: 'm7', type: 'radio', label: '7. 最近身上有没有经常痛？', options: ['没啥感觉', '偶尔干活累了腰酸背痛', '尿液带血，或大腿根、骨盆、脊椎骨疼'], weight: 0.15 },
      { id: 'm8', type: 'radio', label: '8. 查过"PSA"这个指标吗？', options: ['查过，正常范围', '没听过，没查过', '查过，指标偏高但没复查'], weight: 0.05 },
    ],
  },
  {
    id: 'cervical',
    title: '老年女性专属 (宫颈/子宫内膜)',
    gender: 'female',
    questions: [
      { id: 'c1', type: 'radio', label: '1. 您的年纪？', options: ['50岁以下', '50-65岁', '65岁以上'], weight: 0.05 },
      { id: 'c2', type: 'radio', label: '2. 年轻时候的妇科情况？', options: ['正常生娃，注意卫生', '生娃比较多或流产过', '有常年治不好的老妇科炎症或HPV感染'], weight: 0.15 },
      { id: 'c3', type: 'radio', label: '3. 绝经后"见红"的情况？', options: ['绝经后一直干干净净', '绝经比较晚（超过55岁）', '绝经好几年又突然见红'], weight: 0.2 },
      { id: 'c4', type: 'radio', label: '4. 体型和血压血糖？', options: ['体重正常，无高血压糖尿病', '稍微有点胖，血压偏高', '肚子胖，同时有高血压和糖尿病'], weight: 0.1 },
      { id: 'c5', type: 'radio', label: '5. 直系亲属有妇科肿瘤或肠癌吗？', options: ['没听说过', '远房亲戚有过', '亲妈或亲姐妹有过'], weight: 0.1 },
      { id: 'c6', type: 'radio', label: '6. 经常吃乱七八糟的保健品吗？', options: ['不吃，生病去正规医院', '偶尔吃普通钙片、维生素', '常买号称"永葆青春"的不知名保健品'], weight: 0.1 },
      { id: 'c7', type: 'radio', label: '7. 做过宫颈筛查吗？', options: ['查过，没问题', '很多年前查过或从未查过', '查出来过"病变"或"阳性"但没复查'], weight: 0.15 },
      { id: 'c8', type: 'radio', label: '8. 最近下面有什么不舒服吗？', options: ['挺干爽正常的', '偶尔有点干痒', '白带有血丝或臭味，或小肚子坠痛'], weight: 0.15 },
    ],
  },
  {
    id: 'pancreas',
    title: '胰腺与胆道健康测试 (胰腺癌风险)',
    questions: [
      { id: 'p1', type: 'radio', label: '1. 您的年纪？', options: ['50岁以下', '50-65岁', '65岁以上'], weight: 0.05 },
      { id: 'p2', type: 'radio', label: '2. 血糖（糖尿病）情况？', options: ['血糖一直正常', '糖尿病多年，吃药控制还行', '最近一两年突然得糖尿病，或老糖尿病突然控制不住'], weight: 0.2 },
      { id: 'p3', type: 'radio', label: '3. 有胆结石或胰腺炎吗？', options: ['没有，胆囊挺好', '有小结石但没疼过', '得过急性胰腺炎，或胆结石经常发炎'], weight: 0.15 },
      { id: 'p4', type: 'radio', label: '4. 平时饮食习惯？', options: ['粗茶淡饭，搭配着吃', '比较爱吃甜食或面食', '顿顿大鱼大肉，爱吃油炸红烧'], weight: 0.1 },
      { id: 'p5', type: 'radio', label: '5. 抽烟喝酒凶吗？', options: ['不抽烟，不咋喝酒', '偶尔抽点或喝点', '抽烟很凶，长期大量喝酒'], weight: 0.05 },
      { id: 'p6', type: 'radio', label: '6. 直系亲属有胰腺肿瘤吗？', options: ['没听说过', '有远房亲戚得过', '亲父母或亲兄弟姐妹得过'], weight: 0.1 },
      { id: 'p7', type: 'radio', label: '7. 体重最近变化大吗？', options: ['挺稳定的', '稍微瘦了一两斤', '没刻意减肥但最近瘦了十几斤'], weight: 0.15 },
      { id: 'p8', type: 'radio', label: '8. 最近肚子或后背经常疼吗？', options: ['没咋疼过', '偶尔吃坏肚子胃疼', '胃部隐痛连着后背疼，晚上躺下最明显，或眼白发黄'], weight: 0.2 },
    ],
  },
];
