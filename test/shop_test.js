const { expect } = require("chai");

describe("Shop", function () {
    let shop;
    // 模拟买家
    let user1;
    // 模拟卖家
    let user2;

    beforeEach(async function () {
        const Shop = await ethers.getContractFactory("Shop");
        [user1, user2] = await ethers.getSigners();
        shop = await Shop.deploy();
    });

    it("买家注册/查看资料/更新资料测试", async function () {
        // user1注册买家
        await shop.connect(user1).registerBuyer("aaa","aaa@qq.com","chongqing")
        // 查看注册资料
        await shop.connect(user1).users(user1.address).then((result) => {
            expect(result.name).to.equal("aaa")
            expect(result.email).to.equal("aaa@qq.com")
            expect(result.addr).to.equal("chongqing")
        })
        // 更新user1资料
        await shop.connect(user1).updateBuyer("a","a@qq.com","beijing");
        // 检查是否更新成功
        await shop.connect(user1).users(user1.address).then((result) => {
            expect(result.name).to.equal("a")
            expect(result.email).to.equal("a@qq.com")
            expect(result.addr).to.equal("beijing")
        })
    });

    it("注册买家后不能再去注册为卖家测试", async function () {
        // user1注册买家
        await shop.connect(user1).registerBuyer("buyer1", "buyer1@qq.com", "chongqing")
        // 检查是否注册成功
        await shop.connect(user1).users(user1.address).then((result) => {
            expect(result.registered).to.be.true
        })
        // user1再注册为卖家
        await expect(shop.connect(user1).registerSeller("seller", "seller@qq.com", "chongqing", { value: ethers.parseEther("1") })).to.be.reverted;
    });

    it("注册卖家测试", async function () {
        // user2注册卖家
        await shop.connect(user2).registerSeller("seller", "seller@qq.com", "chongqing", { value: ethers.parseEther("1") })
        // 检查是否注册成功
        expect(await shop.seller()).to.equal(user2.address)
    });

    it("注册卖家后不能再去注册为买家测试", async function () {
        // user2注册卖家
        await shop.connect(user2).registerSeller("seller", "seller@qq.com", "chongqing", { value: ethers.parseEther("1") })
        // 检查是否注册成功
        await shop.seller().then((result) => {
            expect(result).to.equal(user2.address)
        })
        // user2注册买家
        await expect(shop.connect(user2).registerBuyer("buyer2", "buyer2@qq.com", "chongqing")).to.be.reverted
    });

    it("卖家添加/更新商品测试", async function () {
        // user2注册卖家
        await shop.connect(user2).registerSeller("seller", "seller@qq.com", "chongqing", { value: ethers.parseEther("1") })
        // 检查是否注册成功
        await shop.seller().then((result) => {
            expect(result).to.equal(user2.address)
        })
        // 添加商品，名称product1，价格1ETH，库存2
        await shop.connect(user2).addProduct("product1", ethers.parseEther("1"), 2)
        // 检查是否添加成功
        await shop.connect(user2).products(0).then((result) => {
            expect(result.name).to.equal("product1")
            expect(result.price).to.equal(ethers.parseEther("1"))
            expect(result.stock).to.equal(2)
        })
        // 更新商品，名称product1，价格2ETH，库存1
        await shop.connect(user2).updateProduct(0, "product1", ethers.parseEther("2"), 1)
        // 检查是否更新成功
        await shop.connect(user2).products(0).then((result) => {
            expect(result.price).to.equal(ethers.parseEther("2"))
            expect(result.stock).to.equal(1)
        })
    });

    it("商品列表/商品详情测试", async function () {
        // user2注册卖家
        await shop.connect(user2).registerSeller("seller", "seller@qq.com", "chongqing", { value: ethers.parseEther("1") })
        // 检查是否注册成功
        await shop.seller().then((result) => {
            expect(result).to.equal(user2.address)
        })
        // 添加商品，名称product1，价格1ETH，库存2
        await shop.connect(user2).addProduct("product1", ethers.parseEther("1"), 2)
        // 检查是否添加成功
        await shop.connect(user2).products(0).then((result) => {
            expect(result.name).to.equal("product1")
            expect(result.price).to.equal(ethers.parseEther("1"))
            expect(result.stock).to.equal(2)
        })
        // 库存大于0的商品列表测试
        await shop.connect(user2).getProductList().then((result) => {
            expect(result.length).to.equal(1)
        })
        // 商品详情测试
        await shop.connect(user2).getProductById(0).then((result) => {
            expect(result.name).to.equal("product1")
            expect(result.price).to.equal(ethers.parseEther("1"))
            expect(result.stock).to.equal(2)
        })
    });

    // 添加/移除/查询愿望清单测试
    // .....

    it("买家购买商品/买家查看自己订单/卖家查看所有订单测试", async function () {
        // user1注册买家
        await shop.connect(user1).registerBuyer("buyer1", "buyer1@qq.com", "chongqing")
        // 检查是否注册成功
        await shop.connect(user1).users(user1.address).then((result) => {
            expect(result.registered).to.be.true
        })
        // user2注册卖家
        await shop.connect(user2).registerSeller("seller", "seller@qq.com", "chongqing", { value: ethers.parseEther("1") })
        // 检查是否注册成功
        await shop.seller().then((result) => {
            expect(result).to.equal(user2.address)
        })
        // user2添加商品，名称product1，价格1ETH，库存2
        await shop.connect(user2).addProduct("product1", ethers.parseEther("1"), 2)
        // 检查是否添加成功
        await shop.connect(user2).products(0).then((result) => {
            expect(result.name).to.equal("product1")
            expect(result.price).to.equal(ethers.parseEther("1"))
            expect(result.stock).to.equal(2)
        })
        // user1购买商品，商品单价1，数量2，所以支付2ETH
        await shop.connect(user1).startTrade(0, 2, { value: ethers.parseEther("2") })
        // 查询是否购买成功
        await shop.connect(user1).getMyOrders().then((result) => {
            expect(result.length).to.equal(1)
        })
        // 卖家查看所有订单
        await shop.connect(user2).getAllOrders().then((result) => {
            expect(result.length).to.equal(1)
        })
    });

    it("买家标记交易完成测试", async function () {
        // user1注册买家
        await shop.connect(user1).registerBuyer("buyer1", "buyer1@qq.com", "chongqing")
        // 检查是否注册成功
        await shop.connect(user1).users(user1.address).then((result) => {
            expect(result.registered).to.be.true
        })
        // user2注册卖家
        await shop.connect(user2).registerSeller("seller", "seller@qq.com", "chongqing", { value: ethers.parseEther("1") })
        // 检查是否注册成功
        await shop.seller().then((result) => {
            expect(result).to.equal(user2.address)
        })
        // user2添加商品，名称product1，价格1ETH，库存2
        await shop.connect(user2).addProduct("product1", ethers.parseEther("1"), 2)
        // 检查是否添加成功
        await shop.connect(user2).products(0).then((result) => {
            expect(result.name).to.equal("product1")
            expect(result.price).to.equal(ethers.parseEther("1"))
            expect(result.stock).to.equal(2)
        })
        // user1购买商品，商品单价1，数量2，所以支付2ETH
        await shop.connect(user1).startTrade(0, 2, { value: ethers.parseEther("2") })
        // 查询是否购买成功
        await shop.connect(user1).getMyOrders().then((result) => {
            expect(result.length).to.equal(1)
        })

        const beforeBalance = await ethers.provider.getBalance(user2.address)
        // user1标记交易完成
        await shop.connect(user1).completed(0)
        const afterBalance = await ethers.provider.getBalance(user2.address)

        // 检查订单状态
        await shop.connect(user1).getMyOrders().then((result) => {
            // 检查是否为1，也就是status.Completed
            expect(result[0].status).to.equal(1)
        })
        // 检查卖家是否获得了货款
        expect(afterBalance).to.be.gt(beforeBalance)
    });

    it("买家申请退货/卖家获取待批准列表/卖家批准退货测试", async function () {
        // user1注册买家
        await shop.connect(user1).registerBuyer("buyer1", "buyer1@qq.com", "chongqing")
        // 检查是否注册成功
        await shop.connect(user1).users(user1.address).then((result) => {
            expect(result.registered).to.be.true
        })
        // user2注册卖家
        await shop.connect(user2).registerSeller("seller", "seller@qq.com", "chongqing", { value: ethers.parseEther("1") })
        // 检查是否注册成功
        await shop.seller().then((result) => {
            expect(result).to.equal(user2.address)
        })
        // user2添加商品，名称product1，价格1ETH，库存2
        await shop.connect(user2).addProduct("product1", ethers.parseEther("1"), 2)
        // 检查是否添加成功
        await shop.connect(user2).products(0).then((result) => {
            expect(result.name).to.equal("product1")
            expect(result.price).to.equal(ethers.parseEther("1"))
            expect(result.stock).to.equal(2)
        })
        // user1购买商品，商品单价1，数量2，所以支付2ETH
        await shop.connect(user1).startTrade(0, 2, { value: ethers.parseEther("2") })
        // 查询是否购买成功
        await shop.connect(user1).getMyOrders().then((result) => {
            expect(result.length).to.equal(1)
        })
        // user1申请退货
        await shop.connect(user1).applyRefund(0)
        // 检查订单状态
        await shop.connect(user1).getMyOrders().then((result) => {
            // 检查是否为2，也就是status.PendingApproval
            expect(result[0].status).to.equal(2)
        })
        // 检查卖家获取待批准列表
        await shop.connect(user2).getPendingApprovalList().then((result) => {
            // 检查是否有一条数据，且状态也能对上
            expect(result.length).to.equal(1)
            expect(result[0].status).to.equal(2)
        })
        
        const beforeBalance = await ethers.provider.getBalance(user1.address)
        // 卖家批准退货
        await shop.connect(user2).approveRefund(0)
        const afterBalance = await ethers.provider.getBalance(user1.address)

        // 检查买家货款是否返还
        expect(afterBalance).to.be.gt(beforeBalance)
        // 检查订单状态是不是已退货
        await shop.connect(user1).getMyOrders().then((result) => {
            // 检查是否为3，也就是status.Returned
            expect(result[0].status).to.equal(3)
        })
    });

    it("添加商品到愿望清单/从愿望清单中移除/查看愿望清单列表测试", async function () {
        // user1注册买家
        await shop.connect(user1).registerBuyer("buyer1", "buyer1@qq.com", "chongqing")
        // 检查是否注册成功
        await shop.connect(user1).users(user1.address).then((result) => {
            expect(result.registered).to.be.true
        })
        // user2注册卖家
        await shop.connect(user2).registerSeller("seller", "seller@qq.com", "chongqing", { value: ethers.parseEther("1") })
        // 检查是否注册成功
        await shop.seller().then((result) => {
            expect(result).to.equal(user2.address)
        })
        // user2添加商品，名称product1，价格1ETH，库存2
        await shop.connect(user2).addProduct("product1", ethers.parseEther("1"), 2)
        // 检查是否添加成功
        await shop.connect(user2).products(0).then((result) => {
            expect(result.name).to.equal("product1")
            expect(result.price).to.equal(ethers.parseEther("1"))
            expect(result.stock).to.equal(2)
        })
        // user1将product1添加到愿望清单
        await shop.connect(user1).addToWashList(0)
        // 检查user1愿望清单是否有1条数据
        await shop.connect(user1).getWashList().then((result) => {
            expect(result.length).to.equal(1)
        })
        // user1将product1从愿望清单中移除
        await shop.connect(user1).removeFromWashList(0)
        // 检查user1愿望清单是否有0条数据
        await shop.connect(user1).getWashList().then((result) => {
            expect(result.length).to.equal(0)
        })
    });
});