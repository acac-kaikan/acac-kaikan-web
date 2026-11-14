import { AxiosError } from "axios";
import { getDb, persistDb } from "./store";
import { rotearAssociadosDemo } from "./associados";
import { criarId, agoraISO } from "@/shared/lib/armazenamentoLocal";

function ok(config: any, data: any, status = 200) {
  return Promise.resolve({
    data: JSON.parse(JSON.stringify(data)),
    status,
    statusText: status === 200 ? "OK" : "Created",
    headers: {},
    config,
    request: {},
  });
}

function fail(config: any, status: any, message: any) {
  const error = new AxiosError(
    message,
    status === 401 ? "ERR_UNAUTHORIZED" : "ERR_DEMO_REQUEST",
    config,
    null,
    {
      status,
      statusText: "Erro",
      headers: {},
      config,
      data: { message },
    },
  );
  return Promise.reject(error);
}

function parseBody(config: any) {
  if (!config.data) return {};
  if (typeof config.data === "string") {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data;
}

function parseUrl(config: any) {
  let raw = config.url || "/";
  if (config.baseURL && raw.startsWith(config.baseURL)) {
    raw = raw.slice(config.baseURL.length);
  }
  const url = new URL(raw, "http://demo.local");
  const query = config.params;
  if (query instanceof URLSearchParams) {
    query.forEach((value, key) => url.searchParams.set(key, value));
  } else if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(
        key,
        Array.isArray(value) ? value.join(",") : String(value),
      );
    });
  }
  return {
    path: url.pathname.replace(/\/+$/, "") || "/",
    params: url.searchParams,
  };
}

function listParam(params: any, key: any) {
  const raw = params.get(key);
  if (!raw) return [];
  return raw.split(",").filter(Boolean);
}

function paginate(items: any, params: any, defaultPageSize = 6) {
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.max(1, Number(params.get("pageSize")) || defaultPageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

function search(value: any, term: any) {
  if (!term) return true;
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .includes(
      String(term)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    );
}

function inDateRange(value: any, from: any, to: any) {
  if (!value) return false;
  const date = String(value).slice(0, 10);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function filtrarEventos(db: any, params: URLSearchParams) {
  const term = params.get("search") || "";
  const statuses = listParam(params, "statuses");
  const types = listParam(params, "types");
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  return db.events
    .filter((event: any) => search(event.name, term))
    .filter((event: any) => statuses.length === 0 || statuses.includes(event.status))
    .filter((event: any) => types.length === 0 || types.includes(event.type))
    .filter((event: any) => {
      if (!from && !to) return true;
      return inDateRange(event.start, from, to) || inDateRange(event.end, from, to);
    })
    .sort((a: any, b: any) => {
      if (a.status === "Em andamento" && b.status !== "Em andamento") return -1;
      if (b.status === "Em andamento" && a.status !== "Em andamento") return 1;
      return String(b.start).localeCompare(String(a.start));
    });
}

function categoryName(db: any, categoryId: any) {
  return db.categories.find((category: any) => category.id === categoryId)?.name || "";
}

function eventName(db: any, eventId: any) {
  return db.events.find((event: any) => event.id === eventId)?.name || "Sem evento";
}

function eventMetrics(db: any, event: any) {
  const menu = db.menu.filter((item: any) => item.eventId === event.id);
  const revenue = menu.reduce(
    (sum: any, item: any) => sum + item.price * item.sold - item.discounts,
    0,
  );
  const menuCosts = menu.reduce((sum: any, item: any) => sum + item.costTotal, 0);
  const additionalCosts = (event.costs || []).reduce(
    (sum: any, cost: any) => sum + Number(cost.value || 0),
    0,
  );
  const costs = menuCosts + additionalCosts;
  return {
    revenue,
    costs,
    profit: revenue - costs,
    sales: event.salesCount || 0,
    additionalCosts,
    menuCosts,
  };
}

function buildProduct(db: any, product: any) {
  return {
    ...product,
    category: categoryName(db, product.categoryId),
    lowStock: Number(product.quantity) <= Number(product.minStock),
  };
}

function buildEvent(db: any, event: any, includeRelations = false) {
  const metrics = eventMetrics(db, event);
  const base = {
    ...event,
    metrics,
    ongoing: event.status === "Em andamento",
  };
  if (!includeRelations) return base;
  return {
    ...base,
    menu: db.menu
      .filter((item: any) => item.eventId === event.id)
      .map((item: any) => ({
        ...item,
        availableQuantity:
          item.type === "ready"
            ? db.products.find((product: any) => product.id === item.productId)?.quantity ??
            0
            : null,
      })),
    donations: db.donations
      .filter((donation: any) => donation.eventId === event.id)
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt))),
    costs: [...(event.costs || [])].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    ),
  };
}

function takenLogin(email: any) {
  return {
    token: `demo-${btoa(email).replace(/=+$/, "")}`,
    user: {
      id: "usuario-demo",
      name: "Administrador",
      email,
      initials: "AD",
      accountLabel: "Conta compartilhada",
    },
  };
}

function settleFiado(fiado: any) {
  const remaining = Math.max(0, Number(fiado.amount) - Number(fiado.paidAmount));
  return {
    ...fiado,
    remaining,
    situationLabel:
      fiado.status === "settled"
        ? `Quitado - ${fiado.paymentMethod || "PIX"}`
        : "Pendente",
  };
}

async function route(config: any) {
  const db = getDb();
  const { path, params } = parseUrl(config);
  const method = String(config.method || "get").toLowerCase();
  const respostaAssociados = rotearAssociadosDemo({
    config,
    path,
    params,
    method,
  });
  if (respostaAssociados) return respostaAssociados;
  const body = parseBody(config);
  const now = agoraISO();

  /* Autenticação demonstrativa */
  if (method === "post" && path === "/auth/login") {
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return fail(config, 400, "Confira o e-mail informado e tente novamente.");
    }
    if (!body.password) {
      return fail(config, 400, "Informe sua senha para continuar.");
    }
    return ok(config, takenLogin(body.email));
  }

  if (method === "post" && path === "/auth/recover") {
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return fail(config, 400, "Confira o e-mail informado e tente novamente.");
    }
    return ok(config, { ok: true });
  }

  if (method === "post" && path === "/auth/reset-password") {
    if (!body.password || body.password.length < 8) {
      return fail(config, 400, "A senha deve ter ao menos 8 caracteres.");
    }
    return ok(config, { ok: true });
  }

  /* Categorias */
  if (method === "get" && path === "/categories") {
    const term = params.get("search") || "";
    const items = db.categories
      .filter((category: any) => search(category.name, term))
      .map((category: any) => ({
        ...category,
        productCount: db.products.filter(
          (product: any) => product.categoryId === category.id,
        ).length,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name, "pt-BR"));
    return ok(config, { items });
  }

  if (method === "post" && path === "/categories") {
    if (!String(body.name || "").trim()) {
      return fail(config, 400, "Informe o nome da categoria.");
    }
    const category = {
      id: criarId("cat"),
      name: String(body.name).trim(),
      description: String(body.description || "").trim(),
      createdAt: now,
    };
    db.categories.push(category);
    persistDb();
    return ok(config, category, 201);
  }

  const categoryMatch = path.match(/^\/categories\/([^/]+)$/);
  if (categoryMatch) {
    const category = db.categories.find((item: any) => item.id === categoryMatch[1]);
    if (!category) return fail(config, 404, "Categoria não encontrada.");
    if (method === "put" || method === "patch") {
      if (!String(body.name || "").trim()) {
        return fail(config, 400, "Informe o nome da categoria.");
      }
      category.name = String(body.name).trim();
      category.description = String(body.description || "").trim();
      persistDb();
      return ok(config, category);
    }
    if (method === "delete") {
      db.categories = db.categories.filter((item: any) => item.id !== category.id);
      db.products.forEach((product: any) => {
        if (product.categoryId === category.id) product.categoryId = null;
      });
      persistDb();
      return ok(config, { ok: true });
    }
  }

  /* Produtos e estoque */
  if (method === "get" && path === "/products") {
    const term = params.get("search") || "";
    const categoryId = params.get("categoryId") || "";
    const stock = params.get("stock") || "";
    const categoryIds = listParam(params, "categoryIds");
    let items = db.products
      .filter((product: any) => search(product.name, term))
      .filter(
        (product: any) =>
          !categoryId || String(product.categoryId) === String(categoryId),
      )
      .filter(
        (product: any) =>
          categoryIds.length === 0 || categoryIds.includes(product.categoryId),
      )
      .filter((product: any) => {
        if (stock === "low") return Number(product.quantity) <= Number(product.minStock);
        if (stock === "out") return Number(product.quantity) === 0;
        if (stock === "ok") return Number(product.quantity) > Number(product.minStock);
        return true;
      })
      .map((product: any) => buildProduct(db, product));
    items = items.sort((a: any, b: any) => a.name.localeCompare(b.name, "pt-BR"));
    return ok(config, paginate(items, params, 6));
  }

  if (method === "post" && path === "/products") {
    if (!String(body.name || "").trim()) {
      return fail(config, 400, "Informe o nome do produto.");
    }
    if (!body.categoryId || !db.categories.some((item: any) => item.id === body.categoryId)) {
      return fail(config, 400, "Selecione uma categoria para o produto.");
    }
    const product = {
      id: criarId("prod"),
      name: String(body.name).trim(),
      description: String(body.description || "").trim(),
      categoryId: body.categoryId,
      quantity: 0,
      minStock: Math.max(0, Number(body.minStock) || 0),
      image: body.image || null,
      createdAt: now,
      lots: [],
      movements: [],
    };
    db.products.unshift(product);
    persistDb();
    return ok(config, buildProduct(db, product), 201);
  }

  const movementMatch = path.match(/^\/products\/([^/]+)\/movements$/);
  if (method === "post" && movementMatch) {
    const product = db.products.find((item: any) => item.id === movementMatch[1]);
    if (!product) return fail(config, 404, "Produto não encontrado.");
    const type = body.type;
    const allowed = ["Reabastecimento", "Consumo interno", "Perda", "Ajuste de saída"];
    if (!allowed.includes(type)) {
      return fail(config, 400, "Selecione o tipo de movimentação.");
    }
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return fail(config, 400, "Informe uma quantidade inteira maior que zero.");
    }
    const isEntry = type === "Reabastecimento";
    if (!isEntry && quantity > Number(product.quantity)) {
      return fail(
        config,
        400,
        "A quantidade não pode ser maior que o saldo disponível.",
      );
    }
    const totalCost = isEntry ? Math.max(0, Number(body.totalCost) || 0) : 0;
    if (isEntry && totalCost < 0) {
      return fail(config, 400, "Confira o custo informado e tente novamente.");
    }
       const unitCost = isEntry && quantity > 0 ? totalCost / quantity : 0;
    const eventName = body.eventName || "";
    const notes = String(body.notes || "").trim();
    const createdMovements: any[] = [];

    if (isEntry) {
      const lotId = criarId("lot");
      product.quantity = Number(product.quantity) + quantity;
      product.lots = product.lots || [];
      product.lots.unshift({
        id: lotId,
        entryQty: quantity,
        balance: quantity,
        totalCost,
        unitCost,
        createdAt: now,
      });
      createdMovements.push({
        id: criarId("mov"),
        lotId,
        type,
        quantity,
        eventName,
        notes,
        totalCost,
        unitCost,
        createdAt: now,
      });
    } else {
      let toRemove = quantity;
      const lots = [...(product.lots || [])].sort((a, b) =>
        String(a.createdAt).localeCompare(String(b.createdAt)),
      );
      lots.forEach((lot) => {
        if (toRemove <= 0) return;
        const used = Math.min(Number(lot.balance) || 0, toRemove);
        if (used <= 0) return;
        lot.balance = Number(lot.balance) - used;
        toRemove -= used;
        const lotUnitCost = Number(lot.unitCost) || 0;
        createdMovements.push({
          id: criarId("mov"),
          lotId: lot.id,
          type,
          quantity: -used,
          eventName,
          notes,
          totalCost: used * lotUnitCost,
          unitCost: lotUnitCost,
          createdAt: now,
        });
      });
      product.quantity = Number(product.quantity) - quantity;
    }

    product.movements = [...createdMovements, ...(product.movements || [])];
    persistDb();
    return ok(config, buildProduct(db, product), 201);
  }

    const lotMovementsMatch = path.match(/^\/lots\/([^/]+)\/movements$/);
  if (method === "get" && lotMovementsMatch) {
    const lotId = lotMovementsMatch[1];
    const product = db.products.find((item: any) =>
      (item.lots || []).some((lot: any) => lot.id === lotId),
    );
    if (!product) return fail(config, 404, "Lote não encontrado.");
    // Movimentações antigas (sem lotId) pertencem ao lote mais antigo do produto
    const oldestLotId = [...product.lots].sort((a: any, b: any) =>
      String(a.createdAt).localeCompare(String(b.createdAt)),
    )[0]?.id;
    const items = (product.movements || [])
      .filter((movement: any) => (movement.lotId ?? oldestLotId) === lotId)
      .sort((a: any, b: any) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      );
    return ok(config, paginate(items, params, 6));
  }

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (method === "put" && productMatch) {
    const product = db.products.find((item: any) => item.id === productMatch[1]);
    if (!product) return fail(config, 404, "Produto não encontrado.");
    if (!String(body.name || "").trim()) {
      return fail(config, 400, "Informe o nome do produto.");
    }
    if (!body.categoryId || !db.categories.some((item: any) => item.id === body.categoryId)) {
      return fail(config, 400, "Selecione uma categoria para o produto.");
    }
    product.name = String(body.name).trim();
    product.description = String(body.description || "").trim();
    product.categoryId = body.categoryId;
    product.minStock = Math.max(0, Number(body.minStock) || 0);
    product.image = body.image || null;
    persistDb();
    return ok(config, buildProduct(db, product));
  }
  if (method === "get" && productMatch) {
    const product = db.products.find((item: any) => item.id === productMatch[1]);
    if (!product) return fail(config, 404, "Produto não encontrado.");
    return ok(config, {
      ...buildProduct(db, product),
      lots: [...(product.lots || [])].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      ),
      movements: [...(product.movements || [])].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      ),
    });
  }

  /* Doações */
  if (method === "get" && path === "/donations") {
    const term = params.get("search") || "";
    const eventIds = listParam(params, "eventIds");
    const types = listParam(params, "types");
    const items = db.donations
      .filter(
        (donation: any) =>
          search(donation.donor, term) || search(donation.itemName, term),
      )
      .filter(
        (donation: any) => eventIds.length === 0 || eventIds.includes(donation.eventId),
      )
      .filter((donation: any) => types.length === 0 || types.includes(donation.type))
      .map((donation: any) => ({
        ...donation,
        eventName: eventName(db, donation.eventId),
      }))
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return ok(config, paginate(items, params, 6));
  }

  if (method === "post" && path === "/donations") {
    if (!body.eventId) {
      return fail(config, 400, "Selecione o evento destinado à doação.");
    }
    if (!["ready", "money", "ingredient"].includes(body.type)) {
      return fail(config, 400, "Selecione o tipo de doação.");
    }
    if (body.type === "ready" && !body.productId) {
      return fail(config, 400, "Selecione o produto doado.");
    }
    if (body.type !== "money" && !String(body.itemName || "").trim()) {
      return fail(config, 400, "Informe o item doado.");
    }
    if (body.type === "ready") {
      const quantity = Number(body.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return fail(config, 400, "Informe uma quantidade inteira maior que zero.");
      }
    }
    if (body.type === "money" && Number(body.amount) <= 0) {
      return fail(config, 400, "Informe um valor maior que zero.");
    }
    const donation = {
      id: criarId("don"),
      eventId: body.eventId,
      type: body.type,
      productId: body.productId || null,
      itemName: body.itemName || null,
      quantity:
        body.type === "ready" ? Number(body.quantity) : Number(body.quantity) || null,
      donor: String(body.donor || "").trim(),
      paymentMethod: body.paymentMethod || null,
      ticketValue: Math.max(0, Number(body.ticketValue) || 0),
      amount: body.type === "money" ? Number(body.amount) : null,
      createdAt: now,
    };
    db.donations.unshift(donation);
    persistDb();
    return ok(
      config,
      { ...donation, eventName: eventName(db, donation.eventId) },
      201,
    );
  }

  const donationMatch = path.match(/^\/donations\/([^/]+)$/);
  if (donationMatch && (method === "put" || method === "delete")) {
    const donation = db.donations.find(
      (item: any) => item.id === donationMatch[1],
    );
    if (!donation) return fail(config, 404, "Doação não encontrada.");

    if (method === "delete") {
      db.donations = db.donations.filter(
        (item: any) => item.id !== donationMatch[1],
      );
      persistDb();
      return ok(config, { ok: true });
    }

    if (!db.events.some((event: any) => event.id === body.eventId)) {
      return fail(config, 400, "Selecione o evento destinado à doação.");
    }
    if (!["ready", "money", "ingredient"].includes(body.type)) {
      return fail(config, 400, "Selecione o tipo de doação.");
    }
    if (body.type === "ready") {
      const product = db.products.find(
        (item: any) => item.id === body.productId,
      );
      if (!product) {
        return fail(config, 400, "Selecione o produto doado.");
      }
      const quantity = Number(body.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return fail(config, 400, "Informe uma quantidade inteira maior que zero.");
      }
    }
    if (
      body.type === "ingredient" &&
      !String(body.itemName || "").trim()
    ) {
      return fail(config, 400, "Informe o item doado.");
    }
    if (
      body.type === "money" &&
      (!Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0)
    ) {
      return fail(config, 400, "Informe um valor maior que zero.");
    }
    const ticketValue = Number(body.ticketValue);
    if (!Number.isFinite(ticketValue) || ticketValue < 0) {
      return fail(config, 400, "O valor não pode ser negativo.");
    }

    donation.eventId = body.eventId;
    donation.type = body.type;
    donation.productId = body.type === "ready" ? body.productId : null;
    donation.itemName =
      body.type === "ready"
        ? db.products.find((item: any) => item.id === body.productId)?.name
        : body.type === "ingredient"
          ? String(body.itemName).trim()
          : null;
    donation.quantity =
      body.type === "ready" ? Number(body.quantity) : null;
    donation.donor = String(body.donor || "").trim();
    donation.paymentMethod =
      body.type === "money" ? body.paymentMethod || "PIX" : null;
    donation.amount =
      body.type === "money" ? Number(body.amount) : null;
    donation.ticketValue = ticketValue;
    persistDb();
    return ok(config, {
      ...donation,
      eventName: eventName(db, donation.eventId),
    });
  }

  /* Eventos */
  if (method === "get" && path === "/events/ongoing") {
    const ongoing = db.events.find((event: any) => event.status === "Em andamento");
    return ok(config, { event: ongoing ? buildEvent(db, ongoing) : null });
  }

  if (method === "get" && path === "/reports/top-products") {
    const eventParams = new URLSearchParams(params);
    eventParams.set("statuses", "Em andamento,Encerrado");
    const events = filtrarEventos(db, eventParams);
    const eventIds = new Set(events.map((event: any) => event.id));
    const grouped = new Map<string, any>();

    db.menu
      .filter((item: any) => eventIds.has(item.eventId) && Number(item.sold) > 0)
      .forEach((item: any) => {
        const key = item.productId
          ? `product:${item.productId}`
          : `name:${item.name}`;
        const current = grouped.get(key) || {
          name: item.name,
          sold: 0,
          revenue: 0,
        };
        current.sold += Number(item.sold) || 0;
        current.revenue +=
          Number(item.price) * Number(item.sold) - Number(item.discounts || 0);
        grouped.set(key, current);
      });

    const parsedLimit = Number(params.get("limit"));
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;
    const items = [...grouped.values()]
      .sort((a: any, b: any) => b.sold - a.sold)
      .slice(0, limit);
    return ok(config, { items });
  }

  if (method === "get" && path === "/events") {
    const items = filtrarEventos(db, params)
      .map((event: any) => buildEvent(db, event));
    return ok(config, paginate(items, params, 8));
  }

  if (method === "post" && path === "/events") {
    if (!String(body.name || "").trim()) {
      return fail(config, 400, "Informe o nome do evento.");
    }
    if (!body.start || !body.end) {
      return fail(config, 400, "Informe a data e hora de início e encerramento.");
    }
    if (new Date(body.end) <= new Date(body.start)) {
      return fail(
        config,
        400,
        "A data de encerramento deve ser posterior à data de início.",
      );
    }
    const event = {
      id: criarId("ev"),
      name: String(body.name).trim(),
      type: body.type || "Evento",
      status: "Não iniciado",
      start: body.start,
      end: body.end,
      notes: String(body.notes || "").trim(),
      salesCount: 0,
      createdAt: now,
      costs: [],
    };
    db.events.unshift(event);
    persistDb();
    return ok(config, buildEvent(db, event), 201);
  }

  const eventUpdateMatch = path.match(/^\/events\/([^/]+)$/);
  if (method === "put" && eventUpdateMatch) {
    const event = db.events.find((item: any) => item.id === eventUpdateMatch[1]);
    if (!event) return fail(config, 404, "Evento não encontrado.");
    if (!String(body.name || "").trim()) {
      return fail(config, 400, "Informe o nome do evento.");
    }
    if (!body.start || !body.end) {
      return fail(config, 400, "Informe a data e hora de início e encerramento.");
    }
    const start = new Date(body.start);
    const end = new Date(body.end);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return fail(
        config,
        400,
        "A data de encerramento deve ser posterior à data de início.",
      );
    }
    event.name = String(body.name).trim();
    event.type = body.type || "Evento";
    event.notes = String(body.notes || "").trim();
    event.start = body.start;
    event.end = body.end;
    persistDb();
    return ok(config, buildEvent(db, event));
  }

  const statusMatch = path.match(/^\/events\/([^/]+)\/status$/);
  if (method === "patch" && statusMatch) {
    const event = db.events.find((item: any) => item.id === statusMatch[1]);
    if (!event) return fail(config, 404, "Evento não encontrado.");
    if (!["Em andamento", "Não iniciado", "Encerrado"].includes(body.status)) {
      return fail(config, 400, "Situação de evento inválida.");
    }
    event.status = body.status;
    persistDb();
    return ok(config, buildEvent(db, event));
  }

  const costMatch = path.match(/^\/events\/([^/]+)\/costs$/);
  if (method === "post" && costMatch) {
    const event = db.events.find((item: any) => item.id === costMatch[1]);
    if (!event) return fail(config, 404, "Evento não encontrado.");
    if (!String(body.name || "").trim()) {
      return fail(config, 400, "Informe o nome do custo.");
    }
    if (Number(body.value) <= 0) {
      return fail(config, 400, "Informe um valor maior que zero.");
    }
    const cost = {
      id: criarId("cost"),
      name: String(body.name).trim(),
      value: Number(body.value),
      description: String(body.description || "").trim(),
      createdAt: now,
    };
    event.costs = [cost, ...(event.costs || [])];
    persistDb();
    return ok(config, buildEvent(db, event, true), 201);
  }

  const eventCostMatch = path.match(/^\/events\/([^/]+)\/costs\/([^/]+)$/);
  if (eventCostMatch && (method === "put" || method === "patch" || method === "delete")) {
    const event = db.events.find((item: any) => item.id === eventCostMatch[1]);
    if (!event) return fail(config, 404, "Evento não encontrado.");
    const cost = (event.costs || []).find(
      (item: any) => item.id === eventCostMatch[2],
    );
    if (!cost) return fail(config, 404, "Custo não encontrado.");

    if (method === "delete") {
      event.costs = event.costs.filter(
        (item: any) => item.id !== eventCostMatch[2],
      );
    } else {
      if (!String(body.name || "").trim()) {
        return fail(config, 400, "Informe o nome do custo.");
      }
      const value = Number(body.value);
      if (!Number.isFinite(value) || value <= 0) {
        return fail(config, 400, "Informe um valor maior que zero.");
      }
      cost.name = String(body.name).trim();
      cost.value = value;
      cost.description = String(body.description || "").trim();
    }

    persistDb();
    return ok(config, buildEvent(db, event, true));
  }

  const menuMatch = path.match(/^\/events\/([^/]+)\/menu$/);
  if (method === "get" && menuMatch) {
    const event = db.events.find((item: any) => item.id === menuMatch[1]);
    if (!event) return fail(config, 404, "Evento não encontrado.");
    const items = db.menu
      .filter((item: any) => item.eventId === event.id)
      .map((item: any) => ({
        ...item,
        availableQuantity:
          item.type === "ready"
            ? db.products.find((product: any) => product.id === item.productId)?.quantity ??
            0
            : null,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name, "pt-BR"));
    return ok(config, {
      items,
      categories: db.categories,
      event: buildEvent(db, event),
    });
  }

  if (method === "post" && menuMatch) {
    const event = db.events.find((item: any) => item.id === menuMatch[1]);
    if (!event) return fail(config, 404, "Evento não encontrado.");
    const type = body.type === "made" ? "made" : "ready";
    if (!String(body.name || "").trim()) {
      return fail(config, 400, "Informe o nome do produto.");
    }
    if (!String(body.category || "").trim()) {
      return fail(config, 400, "Selecione uma categoria.");
    }
    if (type === "ready") {
      const product = db.products.find((item: any) => item.id === body.productId);
      if (!product) {
        return fail(config, 400, "Selecione um produto do estoque.");
      }
      const quantity = Number(body.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return fail(config, 400, "Informe uma quantidade inteira maior que zero.");
      }
      if (quantity > Number(product.quantity)) {
        return fail(
          config,
          400,
          "A quantidade não pode ser maior que o estoque disponível.",
        );
      }
      if (Number(body.price) <= 0) {
        return fail(config, 400, "Informe um preço de venda maior que zero.");
      }
    } else {
      if (Number(body.price) < 0 || Number(body.ingredientCost) < 0) {
        return fail(config, 400, "Confira os valores informados.");
      }
    }
    const item = {
      id: criarId("mi"),
      eventId: event.id,
      productId: type === "ready" ? body.productId : null,
      name: String(body.name).trim(),
      description: String(body.description || "").trim(),
      category: String(body.category).trim(),
      type,
      expected: type === "ready" ? Number(body.quantity) : null,
      price: Number(body.price) || 0,
      unitCost:
        type === "ready"
          ? Number(body.unitCost) ||
          db.products.find((product: any) => product.id === body.productId)?.lots?.[0]
            ?.unitCost ||
          0
          : Number(body.ingredientCost) || 0,
      costTotal:
        type === "ready"
          ? (Number(body.unitCost) ||
            db.products.find((product: any) => product.id === body.productId)?.lots?.[0]
              ?.unitCost ||
            0) * Number(body.quantity)
          : Number(body.ingredientCost) || 0,
      sold: 0,
      discounts: 0,
      image: body.image || null,
    };
    db.menu.push(item);
    persistDb();
    return ok(config, item, 201);
  }

  const menuItemMatch = path.match(/^\/events\/([^/]+)\/menu\/([^/]+)$/);
  if (
    menuItemMatch &&
    (method === "put" || method === "patch" || method === "delete")
  ) {
    const event = db.events.find((item: any) => item.id === menuItemMatch[1]);
    if (!event) return fail(config, 404, "Evento não encontrado.");
    const item = db.menu.find(
      (menuItem: any) =>
        menuItem.id === menuItemMatch[2] && menuItem.eventId === event.id,
    );
    if (!item) return fail(config, 404, "Produto do cardápio não encontrado.");

    if (method === "delete") {
      db.menu = db.menu.filter(
        (menuItem: any) => menuItem.id !== menuItemMatch[2],
      );
      persistDb();
      return ok(config, { ok: true });
    }

    const price = Number(body.price);
    if (
      !Number.isFinite(price) ||
      (item.type === "ready" ? price <= 0 : price < 0)
    ) {
      return fail(config, 400, "Confira o preço de venda informado.");
    }
    if (item.type === "ready") {
      const quantity = Number(body.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return fail(config, 400, "Informe uma quantidade inteira maior que zero.");
      }
      item.price = price;
      item.expected = quantity;
      item.costTotal = Number(item.unitCost || 0) * quantity;
    } else {
      const name = String(body.name || "").trim();
      const category = String(body.category || "").trim();
      const ingredientCost = Number(body.ingredientCost);
      if (!name) return fail(config, 400, "Informe o nome do produto.");
      if (!category) return fail(config, 400, "Selecione uma categoria.");
      if (!Number.isFinite(ingredientCost) || ingredientCost < 0) {
        return fail(config, 400, "Confira os valores informados.");
      }
      item.price = price;
      item.name = name;
      item.description = String(body.description || "").trim();
      item.category = category;
      item.unitCost = ingredientCost;
      item.costTotal = ingredientCost;
      item.image = body.image || null;
    }
    persistDb();
    return ok(config, item);
  }

  const eventMatch = path.match(/^\/events\/([^/]+)$/);
  if (eventMatch) {
    const event = db.events.find((item: any) => item.id === eventMatch[1]);
    if (!event) return fail(config, 404, "Evento não encontrado.");
    if (method === "get") {
      return ok(config, buildEvent(db, event, true));
    }
    if (method === "delete") {
      db.events = db.events.filter((item: any) => item.id !== event.id);
      db.menu = db.menu.filter((item: any) => item.eventId !== event.id);
      db.sales = db.sales.filter((sale: any) => sale.eventId !== event.id);
      db.donations = db.donations.filter(
        (donation: any) => donation.eventId !== event.id,
      );
      db.fiados = db.fiados.filter((fiado: any) => fiado.eventId !== event.id);
      db.cashEntries = db.cashEntries.filter(
        (entry: any) => entry.eventId !== event.id,
      );
      persistDb();
      return ok(config, { ok: true });
    }
  }

  /* Vendas */
  if (method === "post" && path === "/sales") {
    const event = db.events.find((item: any) => item.id === body.eventId);
    if (!event) return fail(config, 400, "Evento não encontrado.");
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return fail(config, 400, "Adicione ao menos um produto à venda.");
    }
    const items = body.items.map((raw: any) => {
      const menuItem = db.menu.find((item: any) => item.id === raw.menuItemId);
      const quantity = Number(raw.quantity);
      const unitPrice = Number(raw.unitPrice);
      const originalPrice = Number(raw.originalPrice) || unitPrice;
      const discount = Math.max(0, originalPrice - unitPrice);
      return {
        menuItemId: raw.menuItemId,
        name: menuItem?.name || raw.name || "Produto",
        unitPrice,
        originalPrice,
        quantity,
        discount,
        total: unitPrice * quantity,
      };
    });
    if (
      items.some(
        (item: any) =>
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0 ||
          item.unitPrice < 0,
      )
    ) {
      return fail(config, 400, "Confira os itens da venda e tente novamente.");
    }
    const sale = {
      id: criarId("sale"),
      eventId: event.id,
      createdAt: now,
      status: "active",
      items,
      discount: items.reduce(
        (sum: any, item: any) => sum + item.discount * item.quantity,
        0,
      ),
      total: items.reduce((sum: any, item: any) => sum + item.total, 0),
    };
    db.sales.unshift(sale);
    items.forEach((saleItem: any) => {
      const menuItem = db.menu.find((item: any) => item.id === saleItem.menuItemId);
      if (menuItem) {
        menuItem.sold += saleItem.quantity;
        menuItem.discounts += saleItem.discount * saleItem.quantity;
      }
    });
    event.salesCount = Number(event.salesCount || 0) + 1;
    persistDb();
    return ok(config, sale, 201);
  }

  const cancelSaleMatch = path.match(/^\/sales\/([^/]+)\/cancel$/);
  if (method === "patch" && cancelSaleMatch) {
    const sale = db.sales.find((item: any) => item.id === cancelSaleMatch[1]);
    if (!sale) return fail(config, 404, "Venda não encontrada.");
    if (sale.status === "active") {
      sale.status = "cancelled";
      sale.items.forEach((saleItem: any) => {
        const menuItem = db.menu.find((item: any) => item.id === saleItem.menuItemId);
        if (menuItem) {
          menuItem.sold = Math.max(0, menuItem.sold - saleItem.quantity);
          menuItem.discounts = Math.max(
            0,
            menuItem.discounts - saleItem.discount * saleItem.quantity,
          );
        }
      });
      const event = db.events.find((item: any) => item.id === sale.eventId);
      if (event) {
        event.salesCount = Math.max(0, Number(event.salesCount || 0) - 1);
      }
      persistDb();
    }
    return ok(config, sale);
  }

  if (method === "get" && path === "/sales") {
    const eventId = params.get("eventId") || "";
    const term = params.get("search") || "";
    const statuses = listParam(params, "statuses");
    const from = params.get("from") || "";
    const to = params.get("to") || "";
    const items = db.sales
      .filter((sale: any) => !eventId || sale.eventId === eventId)
      .filter((sale: any) => statuses.length === 0 || statuses.includes(sale.status))
      .filter(
        (sale: any) =>
          !term ||
          sale.items.some((item: any) => search(item.name, term)),
      )
      .filter((sale: any) => {
        if (!from && !to) return true;
        return inDateRange(sale.createdAt, from, to);
      })
      .map((sale: any) => ({
        ...sale,
        eventName: eventName(db, sale.eventId),
        quantity: sale.items.reduce((sum: any, item: any) => sum + item.quantity, 0),
        productsLabel: sale.items
          .map((item: any) => `${item.quantity} x ${item.name}`)
          .join(", "),
      }))
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return ok(config, paginate(items, params, 8));
  }

  /* Caixa e fiados */
  if (method === "get" && path === "/cash") {
    const eventId = params.get("eventId") || "";
    const types = listParam(params, "types");
    const payments = listParam(params, "payments");
    const entries = db.cashEntries
      .filter((entry: any) => !eventId || entry.eventId === eventId)
      .filter((entry: any) => types.length === 0 || types.includes(entry.type))
      .filter((entry: any) => payments.length === 0 || payments.includes(entry.payment))
      .map((entry: any) => ({
        ...entry,
        paymentLabel:
          entry.payment === "Fiado"
            ? `Fiado${entry.debtorName ? ` · ${entry.debtorName}` : ""}`
            : entry.payment,
      }))
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const scoped = db.cashEntries.filter(
      (entry: any) => !eventId || entry.eventId === eventId,
    );
    const summary = {
      sold: scoped
        .filter((entry: any) => entry.type === "Venda de fichas")
        .reduce((sum: any, entry: any) => sum + Number(entry.value || 0), 0),
      returned: scoped
        .filter((entry: any) => entry.type === "Devolução")
        .reduce((sum: any, entry: any) => sum + Number(entry.value || 0), 0),
      openFiados: db.fiados
        .filter((fiado: any) => !eventId || fiado.eventId === eventId)
        .filter((fiado: any) => fiado.status === "pending")
        .reduce(
          (sum: any, fiado: any) =>
            sum + Math.max(0, Number(fiado.amount) - Number(fiado.paidAmount)),
          0,
        ),
    };
    return ok(config, {
      summary,
      fiadosCount: db.fiados.filter(
        (fiado: any) => (!eventId || fiado.eventId === eventId) && fiado.status === "pending",
      ).length,
      ...paginate(entries, params, 6),
    });
  }

  if (method === "post" && path === "/cash") {
    if (!body.eventId) return fail(config, 400, "Evento não encontrado.");
    if (!["Venda de fichas", "Devolução"].includes(body.type)) {
      return fail(config, 400, "Selecione o tipo de registro.");
    }
    if (Number(body.value) <= 0) {
      return fail(config, 400, "Informe um valor maior que zero.");
    }
    if (!["PIX", "Débito", "Crédito", "Dinheiro", "Fiado"].includes(body.payment)) {
      return fail(config, 400, "Selecione a forma de pagamento.");
    }
    if (body.payment === "Fiado" && !String(body.debtorName || "").trim()) {
      return fail(config, 400, "Informe o nome do devedor.");
    }
    const entry = {
      id: criarId("cash"),
      eventId: body.eventId,
      type: body.type,
      value: Number(body.value),
      payment: body.payment,
      debtorName: body.payment === "Fiado" ? String(body.debtorName).trim() : null,
      createdAt: now,
    };
    db.cashEntries.unshift(entry);
    if (body.payment === "Fiado") {
      db.fiados.unshift({
        id: criarId("fiado"),
        eventId: body.eventId,
        entryId: entry.id,
        amount: Number(body.value),
        paidAmount: 0,
        debtorName: String(body.debtorName).trim(),
        note: String(body.note || "").trim(),
        status: "pending",
        paymentMethod: null,
        createdAt: now,
        settledAt: null,
      });
    }
    persistDb();
    return ok(config, entry, 201);
  }

  const cancelCashMatch = path.match(/^\/cash\/([^/]+)$/);
  if (method === "delete" && cancelCashMatch) {
    const entry = db.cashEntries.find((item: any) => item.id === cancelCashMatch[1]);
    if (!entry) return fail(config, 404, "Lançamento não encontrado.");
    db.cashEntries = db.cashEntries.filter((item: any) => item.id !== entry.id);
    db.fiados = db.fiados.filter((fiado: any) => fiado.entryId !== entry.id);
    persistDb();
    return ok(config, { ok: true });
  }

  if (method === "get" && path === "/fiados") {
    const eventId = params.get("eventId") || "";
    const eventIds = listParam(params, "eventIds");
    const status = params.get("status") || "";
    const term = params.get("search") || "";
    const items = db.fiados
      .filter((fiado: any) => !eventId || fiado.eventId === eventId)
      .filter(
        (fiado: any) =>
          eventIds.length === 0 || eventIds.includes(fiado.eventId),
      )
      .filter((fiado: any) => !status || fiado.status === status)
      .filter((fiado: any) => search(fiado.debtorName, term))
      .map((fiado: any) => ({
        ...settleFiado(fiado),
        eventName: eventName(db, fiado.eventId),
      }))
      .sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return ok(config, {
      pendingCount: items.filter((item: any) => item.status === "pending").length,
      openAmount: items
        .filter((item: any) => item.status === "pending")
        .reduce((sum: any, item: any) => sum + item.remaining, 0),
      ...paginate(items, params, 6),
    });
  }

  const settleMatch = path.match(/^\/fiados\/([^/]+)\/settle$/);
  if (method === "post" && settleMatch) {
    const fiado = db.fiados.find((item: any) => item.id === settleMatch[1]);
    if (!fiado) return fail(config, 404, "Fiado não encontrado.");
    const value = Number(body.value);
    const remaining = Math.max(
      0,
      Number(fiado.amount) - Number(fiado.paidAmount),
    );
    if (value <= 0) {
      return fail(config, 400, "Informe um valor maior que zero.");
    }
    if (value > remaining) {
      return fail(config, 400, "O valor não pode ser maior que o saldo do fiado.");
    }
    if (!["PIX", "Débito", "Crédito", "Dinheiro"].includes(body.paymentMethod)) {
      return fail(config, 400, "Selecione a forma de pagamento.");
    }
    fiado.paidAmount = Number(fiado.paidAmount) + value;
    fiado.paymentMethod = body.paymentMethod;
    if (fiado.paidAmount >= fiado.amount) {
      fiado.status = "settled";
      fiado.settledAt = now;
    }
    persistDb();
    return ok(config, settleFiado(fiado));
  }

  const unsettleMatch = path.match(/^\/fiados\/([^/]+)\/unsettle$/);
  if (method === "patch" && unsettleMatch) {
    const fiado = db.fiados.find((item: any) => item.id === unsettleMatch[1]);
    if (!fiado) return fail(config, 404, "Fiado não encontrado.");
    fiado.paidAmount = 0;
    fiado.status = "pending";
    fiado.paymentMethod = null;
    fiado.settledAt = null;
    persistDb();
    return ok(config, settleFiado(fiado));
  }

  return fail(config, 404, "Recurso não encontrado no modo de demonstração.");
}

export function demoAdapter(config: any) {
  return route(config).catch((error) => {
    if (error instanceof AxiosError) throw error;
    const wrapped = new AxiosError(
      "Não foi possível concluir a operação.",
      "ERR_DEMO_REQUEST",
      config,
      null,
      {
        status: 500,
        statusText: "Erro",
        headers: {},
        config,
        data: { message: "Não foi possível concluir a operação." },
      },
    );
    throw wrapped;
  });
}
