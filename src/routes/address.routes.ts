import { Router } from 'express';
import { Address, Country, City } from '../db/models';
import { ok } from '../utils/response';
import { asyncHandler, getPage, paginate } from '../utils/http';
import { authRequired, AuthedRequest } from '../middleware/auth';
import { pageSize } from './app.routes';
import { presentAddress } from '../presenters/app';

const router = Router();

const addressInclude = [
  { model: Country, as: 'country' },
  { model: City, as: 'city' },
  { model: City, as: 'governorate' },
];

function addressBody(req: any) {
  const b = req.body;
  return {
    type: b.type,
    country_id: b.country_id || null,
    address_name: b.address_name,
    city_id: b.city_id || null,
    governorate_id: b.governorate_id || null,
    block: b.block,
    street: b.street,
    avenue: b.avenue,
    house_number: b.house_number,
    building_number: b.building_number,
    floor_number: b.floor_number,
    apartment_number: b.apartment_number,
    address_line_1: b.address_line_1,
    address_line_2: b.address_line_2,
    notes: b.notes,
    latitude: b.latitude,
    longitude: b.longitude,
  };
}

router.get('/getMyAddresses', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  const page = getPage(req);
  const size = await pageSize();
  const { limit, offset } = paginate(page, size);
  const { count, rows } = await Address.findAndCountAll({
    where: { user_id: req.authUser.id }, include: addressInclude, limit, offset, order: [['id', 'DESC']],
  });
  ok(res, { items: rows.map(presentAddress), is_more: offset + rows.length < count });
}));

router.post('/addNewAdress', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  await Address.create({ ...addressBody(req), user_id: req.authUser.id });
  ok(res, {}, 'Address added');
}));

router.post('/updateAdress/:address_id', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  const address = await Address.findOne({ where: { id: req.params.address_id, user_id: req.authUser.id } });
  if (!address) return ok(res, {}, 'Address not found');
  await address.update(addressBody(req));
  ok(res, {}, 'Address updated');
}));

router.get('/deleteAddress/:id', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  await Address.destroy({ where: { id: req.params.id, user_id: req.authUser.id } });
  ok(res, {}, 'Address deleted');
}));

export default router;
