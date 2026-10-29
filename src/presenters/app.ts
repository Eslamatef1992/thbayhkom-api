import { chosenExtras, extrasTotal, parseExtraIds, parseSnapshot } from '../services/extras';
import { presentProduct, presentPackage, packageAsProduct, presentExtra } from './catalog';
import { localized } from '../utils/requestContext';

export function presentSetting(s: any, pages: any[], cutTypes: any[], serviceTypes: any[]) {
  if (!s) return null;
  return {
    id: s.id,
    url: s.url,
    logo: s.logo,
    appointment_price: s.appointment_price,
    footer_logo: s.footer_logo,
    tax_amount: s.tax_amount,
    points_in_mony: s.points_in_mony,
    mony_in_points: s.mony_in_points,
    app_store_url: s.app_store_url,
    play_store_url: s.play_store_url,
    info_email: s.info_email,
    mobile: s.mobile,
    phone: s.phone,
    facebook: s.facebook,
    twitter: s.twitter,
    linked_in: s.linked_in,
    instagram: s.instagram,
    snapchat: s.snapchat,
    whatsApp: s.whatsApp,
    google_plus: s.google_plus,
    min_order: s.min_order,
    from_hour: s.from_hour,
    to_hour: s.to_hour,
    latitude: s.latitude,
    longitude: s.longitude,
    youtube: s.youtube,
    image: s.image,
    banner_image: s.banner_image,
    banner_link: s.banner_link,
    paginateTotal: s.paginateTotal,
    admin_commission_parcent: s.admin_commission_parcent,
    is_maintenance_mode: s.is_maintenance_mode,
    is_alowed_register: s.is_alowed_register,
    is_alowed_login: s.is_alowed_login,
    is_alowed_buying: s.is_alowed_buying,
    is_alowed_cart: s.is_alowed_cart,
    account_need_to_activate: s.account_need_to_activate,
    created_at: s.created_at ?? s.createdAt,
    updated_at: s.updated_at ?? s.updatedAt,
    title: s.title,
    description: s.description,
    address: s.address,
    pages: (pages || []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      image: p.image,
      views: p.views,
      created_at: p.created_at ?? p.createdAt,
      title: p.title,
      description: p.description,
      key_words: p.key_words,
    })),
    cutTypes: (cutTypes || []).map((t: any) => ({ id: t.id, status: t.status, created_at: t.created_at ?? t.createdAt, name: t.name })),
    serviceTypes: (serviceTypes || []).map((t: any) => ({ id: t.id, status: t.status, created_at: t.created_at ?? t.createdAt, name: t.name })),
  };
}

export function presentAdvertisement(a: any) {
  if (!a) return null;
  return {
    id: a.id,
    type: a.type,
    item_id: a.item_id,
    status: a.status,
    image: a.image,
    link: a.link,
    created_at: a.created_at ?? a.createdAt,
    category_name: a.category_name,
  };
}

export function presentAddress(a: any) {
  return {
    id: a.id,
    user_id: a.user_id,
    address_name: a.address_name,
    country_id: a.country_id,
    city_id: a.city_id,
    governorate_id: a.governorate_id,
    country: a.country || null,
    city: a.city || null,
    governorate: a.governorate || null,
    block: a.block,
    street: a.street,
    avenue: a.avenue,
    type: a.type,
    building_number: a.building_number,
    floor_number: a.floor_number,
    apartment_number: a.apartment_number,
    house_number: a.house_number,
    address_line_1: a.address_line_1,
    address_line_2: a.address_line_2,
    notes: a.notes,
    defult: a.defult,
    longitude: a.longitude,
    latitude: a.latitude,
    created_at: a.created_at ?? a.createdAt,
  };
}


function typeShape(t: any) {
  return t ? { id: t.id, status: t.status, created_at: t.created_at ?? t.createdAt, name: t.name } : null;
}

export function presentCartItem(c: any) {
  const chosen = c.package ? chosenExtras(c.package, parseExtraIds(c.extra_ids)) : [];
  return {
    id: c.id,
    user_id: c.user_id,
    fcm_token: c.fcm_token,
    product_id: c.product_id,
    quantity: c.quantity,
    cut_type_id: c.cut_type_id,
    service_type_id: c.service_type_id,
    country_id: c.country_id,
    special_request: c.special_request,
    created_at: c.created_at ?? c.createdAt,
    product: c.product ? presentProduct(c.product) : c.package ? packageAsProduct(c.package, extrasTotal(chosen)) : null,
    package_id: c.package_id ?? null,
    package: c.package ? presentPackage(c.package) : null,
    /** Add-ons chosen for a package line (prices included in product.price). */
    extras: chosen.map(presentExtra),
    extras_total: extrasTotal(chosen),
    cut_type: typeShape(c.cut_type),
    service_type: typeShape(c.service_type),
  };
}

export function presentOrder(o: any) {
  return {
    id: o.id,
    user_id: o.user_id,
    total_price: o.total_price,
    address_id: o.address_id,
    discount: o.discount,
    delivery_cost: o.delivery_cost,
    discount_code: o.discount_code,
    sub_total: o.sub_total,
    count_items: o.count_items,
    fcm_token: o.fcm_token,
    name: o.name,
    email: o.email,
    mobile: o.mobile,
    payment_id: o.payment_id,
    transaction_id: o.transaction_id,
    payment_json: o.payment_json,
    payment_check_response: o.payment_check_response,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    status: o.status,
    ordered_date: o.ordered_date,
    special_request: o.special_request,
    created_at: o.created_at ?? o.createdAt,
    status_name: o.status_name,
  };
}

export function presentOrderDetails(o: any) {
  return {
    ...presentOrder(o),
    products: (o.products || []).map((op: any) => ({
      id: op.id,
      order_id: op.order_id,
      product_id: op.product_id,
      cut_type_id: op.cut_type_id,
      service_type_id: op.service_type_id,
      special_request: op.special_request,
      quantity: op.quantity,
      discount: op.discount,
      price: op.price,
      offer_price: op.offer_price,
      created_at: op.created_at ?? op.createdAt,
      product: op.product ? presentProduct(op.product) : op.package ? packageAsProduct(op.package, Number(op.extras_total) || 0) : null,
      package_id: op.package_id ?? null,
      package: op.package ? presentPackage(op.package) : null,
      /** Add-ons as ordered (names/prices at the time of the order). */
      extras: parseSnapshot(op.extras).map((e) => ({ id: e.id, name: localized(e, 'name'), price: e.price, is_free: !e.price })),
      extras_total: Number(op.extras_total) || 0,
      service_type: typeShape(op.service_type),
      cut_type: typeShape(op.cut_type),
    })),
    address: o.address ? presentAddress(o.address) : null,
  };
}

export function presentPromotionCode(p: any) {
  return {
    id: p.id,
    code: p.code,
    percent: p.percent,
    type: p.type,
    status: p.status,
    start_date: p.start_date,
    end_date: p.end_date,
    description: p.description,
    created_at: p.created_at ?? p.createdAt,
  };
}

export function presentNotification(n: any) {
  return {
    id: n.id,
    user_id: n.user_id,
    order_id: n.order_id,
    messag_type: n.messag_type,
    status: n.status,
    created_at: n.created_at ?? n.createdAt,
    message: n.message,
    title: n.title,
  };
}
