import { Router } from 'express';
import { Op } from 'sequelize';
import {
  Setting, SettingTranslation, Advertisement, Page, PageTranslation, CutType, CutTypeTranslation,
  ServiceType, ServiceTypeTranslation, Category, CategoryTranslation, Country, CountryTranslation,
  City, CityTranslation, Banner, Product, ProductTranslation, ProductImage, ProductCutType,
  ProductServiceType, Favorite, ContactMessage,
} from '../db/models';
import { ok, fail } from '../utils/response';
import { asyncHandler, getPage, paginate } from '../utils/http';
import { authOptional, authRequired, AuthedRequest } from '../middleware/auth';
import {
  presentCategory, presentTypes, presentCity, presentCountry, presentBanner, presentProduct,
} from '../presenters/catalog';
import { presentSetting, presentAdvertisement } from '../presenters/app';

const router = Router();

async function pageSize(): Promise<number> {
  const s: any = await Setting.findOne();
  return s?.paginate_total || 10;
}

async function favoriteIds(userId?: number): Promise<Set<number>> {
  if (!userId) return new Set();
  const favs = await Favorite.findAll({ where: { user_id: userId } });
  return new Set(favs.map((f: any) => f.product_id));
}

const productInclude = [
  { model: ProductTranslation, as: 'translations' },
  { model: ProductImage, as: 'images' },
  { model: ProductCutType, as: 'cut_types', include: [{ model: CutType, as: 'cut_type', include: [{ model: CutTypeTranslation, as: 'translations' }] }] },
  { model: ProductServiceType, as: 'service_types', include: [{ model: ServiceType, as: 'service_type', include: [{ model: ServiceTypeTranslation, as: 'translations' }] }] },
];

// --- App / Settings ---
router.get('/getSetting', asyncHandler(async (req: AuthedRequest, res) => {
  const lang = req.ctx?.lang || 'en';
  const setting = await Setting.findOne({ include: [{ model: SettingTranslation, as: 'translations' }] });
  const ad = await Advertisement.findOne({ where: { status: 'active' } });
  const pages = await Page.findAll({ include: [{ model: PageTranslation, as: 'translations' }] });
  const cutTypes = await CutType.findAll({ include: [{ model: CutTypeTranslation, as: 'translations' }] });
  const serviceTypes = await ServiceType.findAll({ include: [{ model: ServiceTypeTranslation, as: 'translations' }] });
  ok(res, {
    settings: presentSetting(setting, pages, cutTypes, serviceTypes, lang),
    advertisement: presentAdvertisement(ad),
  });
}));

router.get('/getCategories', asyncHandler(async (req: AuthedRequest, res) => {
  const lang = req.ctx?.lang || 'en';
  const items = await Category.findAll({ where: { status: 'active' }, include: [{ model: CategoryTranslation, as: 'translations' }] });
  ok(res, { items: items.map((c) => presentCategory(c, lang)) });
}));

router.get('/getCutTypes', asyncHandler(async (req: AuthedRequest, res) => {
  const lang = req.ctx?.lang || 'en';
  const items = await CutType.findAll({ include: [{ model: CutTypeTranslation, as: 'translations' }] });
  ok(res, { items: items.map((t) => presentTypes(t, lang)) });
}));

router.get('/getCountries', asyncHandler(async (req: AuthedRequest, res) => {
  const lang = req.ctx?.lang || 'en';
  const items = await Country.findAll({ include: [{ model: CountryTranslation, as: 'translations' }] });
  ok(res, { items: items.map((c) => presentCountry(c, lang)) });
}));

router.get('/getGovernoratesByCountryId/:id', asyncHandler(async (req: AuthedRequest, res) => {
  const lang = req.ctx?.lang || 'en';
  const items = await City.findAll({ where: { country_id: req.params.id, parent_id: null as any }, include: [{ model: CityTranslation, as: 'translations' }] });
  ok(res, { items: items.map((c) => presentCity(c, lang)) });
}));

router.get('/getCitiesByCountryId/:id', asyncHandler(async (req: AuthedRequest, res) => {
  const lang = req.ctx?.lang || 'en';
  const items = await City.findAll({ where: { country_id: req.params.id, parent_id: { [Op.ne]: null } }, include: [{ model: CityTranslation, as: 'translations' }] });
  ok(res, { items: items.map((c) => presentCity(c, lang)) });
}));

router.get('/getBanners', asyncHandler(async (_req, res) => {
  const items = await Banner.findAll({ where: { status: 'active' } });
  ok(res, { items: items.map(presentBanner) });
}));

router.post('/contactUs', asyncHandler(async (req, res) => {
  const { name, email, mobile, message } = req.body;
  await ContactMessage.create({ name, email, mobile, message });
  ok(res, {}, 'Message sent successfully');
}));

export default router;
export { pageSize, favoriteIds, productInclude };

