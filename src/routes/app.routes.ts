import { Router } from 'express';
import { Op } from 'sequelize';
import {
  Setting, Advertisement, Page, CutType, ServiceType, Category, Country, CountryTranslation,
  City, Banner, Product, ProductImage, ProductCutType, ProductServiceType, Favorite, ContactMessage,
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
  const s = await Setting.findOne();
  return (s as any)?.paginateTotal || 10;
}

async function favoriteIds(userId?: number): Promise<Set<number>> {
  if (!userId) return new Set();
  const favs = await Favorite.findAll({ where: { user_id: userId } });
  return new Set(favs.map((f: any) => f.product_id));
}

const productInclude = [
  { model: ProductImage, as: 'images' },
  { model: ProductCutType, as: 'cut_types', include: [{ model: CutType, as: 'cut_type' }] },
  { model: ProductServiceType, as: 'service_types', include: [{ model: ServiceType, as: 'service_type' }] },
];

// --- App / Settings ---
router.get('/getSetting', asyncHandler(async (_req, res) => {
  const setting = await Setting.findOne();
  const ad = await Advertisement.findOne({ where: { status: 'active' } });
  const pages = await Page.findAll();
  const cutTypes = await CutType.findAll();
  const serviceTypes = await ServiceType.findAll();
  ok(res, {
    settings: presentSetting(setting, pages, cutTypes, serviceTypes),
    advertisement: presentAdvertisement(ad),
  });
}));

router.get('/getCategories', asyncHandler(async (_req, res) => {
  const items = await Category.findAll({ where: { status: 'active' } });
  ok(res, { items: items.map(presentCategory) });
}));

router.get('/getCutTypes', asyncHandler(async (_req, res) => {
  const items = await CutType.findAll();
  ok(res, { items: items.map(presentTypes) });
}));

router.get('/getCountries', asyncHandler(async (_req, res) => {
  const items = await Country.findAll({ include: [{ model: CountryTranslation, as: 'translations' }] });
  ok(res, { items: items.map(presentCountry) });
}));

router.get('/getGovernoratesByCountryId/:id', asyncHandler(async (req, res) => {
  const items = await City.findAll({ where: { country_id: req.params.id, parent_id: null as any } });
  ok(res, { items: items.map(presentCity) });
}));

router.get('/getCitiesByCountryId/:id', asyncHandler(async (req, res) => {
  const items = await City.findAll({ where: { country_id: req.params.id, parent_id: { [Op.ne]: null } } });
  ok(res, { items: items.map(presentCity) });
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
