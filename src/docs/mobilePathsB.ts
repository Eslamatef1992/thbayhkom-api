import { S, I, ok200, form, jsonBody, pathId, queryPage, queryFcm } from './helpers';
import { mobileExamples } from './examples';

export function mobilePathsB(): Record<string, any> {
  const paths: Record<string, any> = {};

  // Addresses
  const addressBody = form(
    {
      type: S, country_id: S, address_name: S, city_id: S, governorate_id: S, block: S, street: S,
      house_number: S, avenue: S, building_number: S, floor_number: S, apartment_number: S,
      address_line_1: S, address_line_2: S, notes: S, latitude: S, longitude: S,
    },
    [],
    { type: 'House', country_id: '1', address_name: 'Home', city_id: '2', governorate_id: '1', block: '5', street: '10', house_number: '3', avenue: '4', notes: 'Ring the bell', latitude: '29.3', longitude: '48.0' }
  );
  paths['/getMyAddresses'] = { get: { tags: ['Addresses'], summary: 'List addresses (paginated)', security: [{ bearerAuth: [] }], parameters: [queryPage()], responses: ok200(mobileExamples.getMyAddresses) } };
  paths['/addNewAdress'] = { post: { tags: ['Addresses'], summary: 'Add address (spelling intentional)', security: [{ bearerAuth: [] }], requestBody: addressBody, responses: ok200() } };
  paths['/updateAdress/{address_id}'] = { post: { tags: ['Addresses'], summary: 'Update address (spelling intentional)', security: [{ bearerAuth: [] }], parameters: [{ name: 'address_id', in: 'path', required: true, schema: I }], requestBody: addressBody, responses: ok200() } };
  paths['/deleteAddress/{id}'] = { get: { tags: ['Addresses'], summary: 'Delete address', security: [{ bearerAuth: [] }], parameters: [pathId()], responses: ok200() } };

  // Cart
  paths['/addProductToCart/{productId}'] = { get: { tags: ['Cart'], summary: 'Add product to cart', parameters: [{ name: 'productId', in: 'path', required: true, schema: I }, { name: 'cut_type_id', in: 'query', schema: I }, { name: 'service_type_id', in: 'query', schema: I }, { name: 'quantity', in: 'query', schema: I }, queryFcm()], responses: ok200(mobileExamples.addToCart) } };
  paths['/getMyCart'] = { get: { tags: ['Cart'], summary: 'Get cart (MyCart + total)', parameters: [queryFcm()], responses: ok200(mobileExamples.getMyCart) } };
  paths['/changeQuantity/{cart_id}'] = { get: { tags: ['Cart'], summary: 'Change quantity (type 1=inc, 2=dec)', parameters: [{ name: 'cart_id', in: 'path', required: true, schema: I }, { name: 'type', in: 'query', schema: I }, queryFcm()], responses: ok200() } };
  paths['/deleteProductCart/{id}'] = { get: { tags: ['Cart'], summary: 'Remove cart item', parameters: [pathId(), queryFcm()], responses: ok200() } };
  paths['/deleteCartItems'] = { get: { tags: ['Cart'], summary: 'Clear cart', parameters: [queryFcm()], responses: ok200() } };
  paths['/checkPromo'] = { get: { tags: ['Cart'], summary: 'Validate promo code', parameters: [queryFcm(), { name: 'name', in: 'query', schema: S }], responses: ok200(mobileExamples.checkPromo) } };
  paths['/calculateDeliveryCost'] = { get: { tags: ['Cart'], summary: 'Delivery cost for a city', parameters: [{ name: 'city_id', in: 'query', schema: I }], responses: ok200(mobileExamples.deliveryCost) } };

  // Checkout / Orders / Notifications
  paths['/checkOut'] = { post: { tags: ['Checkout'], summary: 'Checkout cart (user or guest). Returns order + payment url (null for COD).', security: [{ bearerAuth: [] }], requestBody: form({ address_id: S, code_name: S, payment_type: S, fcmToken: S, full_name: S, email: S, mobile: S, address_name: S, country_id: S, city_id: S, governorate_id: S, block: S, avenue: S, street: S, type: S, building_number: S, house_number: S, floor_number: S, apartment_number: S, address_line_1: S, address_line_2: S, latitude: S, longitude: S, notes: S }, [], { address_id: '1', code_name: 'WELCOME10', payment_type: '3', fcmToken: 'fcm-token-123' }), responses: ok200(mobileExamples.checkout) } };
  paths['/checkOutByProductId'] = { post: { tags: ['Checkout'], summary: 'Buy now (single product), user or guest', security: [{ bearerAuth: [] }], requestBody: form({ address_id: S, product_id: S, quantity: S, cut_type_id: S, service_type_id: S, special_request: S, code_name: S, payment_type: S, fcmToken: S }, [], { address_id: '1', product_id: '1', quantity: '2', cut_type_id: '1', service_type_id: '1', payment_type: '3', fcmToken: 'fcm-token-123' }), responses: ok200(mobileExamples.checkout) } };
  paths['/getMyOrders'] = { get: { tags: ['Orders'], summary: 'List my orders (paginated)', security: [{ bearerAuth: [] }], parameters: [queryPage(), queryFcm()], responses: ok200(mobileExamples.getMyOrders) } };
  paths['/getOrderById/{id}'] = { get: { tags: ['Orders'], summary: 'Order details', security: [{ bearerAuth: [] }], parameters: [pathId(), queryFcm()], responses: ok200(mobileExamples.getOrderById) } };
  paths['/myNotifications'] = { get: { tags: ['Notifications'], summary: 'List notifications (paginated)', security: [{ bearerAuth: [] }], parameters: [queryPage(), queryFcm()], responses: ok200(mobileExamples.myNotifications) } };

  // Uploads (auth required: any customer or admin)
  paths['/upload/single'] = {
    post: {
      tags: ['Uploads'], summary: 'Upload a single image → returns its URL', security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } },
      },
      responses: ok200({ url: 'http://localhost:3000/uploads/1700000000000-123456789.jpg', filename: '1700000000000-123456789.jpg' }),
    },
  };
  paths['/upload/multiple'] = {
    post: {
      tags: ['Uploads'], summary: 'Upload up to 10 images → returns their URLs', security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'multipart/form-data': { schema: { type: 'object', required: ['files'], properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } } } } },
      },
      responses: ok200({ urls: ['http://localhost:3000/uploads/a.jpg', 'http://localhost:3000/uploads/b.jpg'], files: [{ url: 'http://localhost:3000/uploads/a.jpg', filename: 'a.jpg' }, { url: 'http://localhost:3000/uploads/b.jpg', filename: 'b.jpg' }] }),
    },
  };
  paths['/upload/delete'] = {
    post: {
      tags: ['Uploads'], summary: 'Delete an uploaded image by URL or filename', security: [{ bearerAuth: [] }],
      requestBody: jsonBody({ url: 'http://localhost:3000/uploads/1700000000000-123456789.jpg' }, { url: S, filename: S }),
      responses: ok200({ filename: '1700000000000-123456789.jpg' }),
    },
    delete: {
      tags: ['Uploads'], summary: 'Delete an uploaded image by URL or filename (query param)', security: [{ bearerAuth: [] }],
      parameters: [{ name: 'url', in: 'query', schema: S }, { name: 'filename', in: 'query', schema: S }],
      responses: ok200({ filename: '1700000000000-123456789.jpg' }),
    },
  };

  return paths;
}

