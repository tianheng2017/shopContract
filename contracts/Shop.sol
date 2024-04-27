// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// 购物合约
contract Shop {

    // 订单状态枚举
    enum Status {
        // 买家已付款
        Paid,
        // 交易已完成
        Completed,
        // 退货待批准
        PendingApproval,
        // 已退货
        Returned
    }

    // 用户结构体
    struct User {
        // 名字
        string name;
        // 电子邮件
        string email;
        // 发货/送货地址
        string addr;
        // 是否注册
        bool registered;
    }

    // 商品结构体
    struct Product {
        // 商品ID
        uint productId;
        // 名字
        string name;
        // 价格
        uint price;
        // 库存
        uint stock;
    }

    // 订单结构体
    struct Order {
        // 卖家
        address seller;
        // 买家
        address buyer;
        // 商品快照
        Product product;
        // 交易数量
        uint quantity;
        // 订单状态
        Status status;
    }

    // 买家/卖家信息映射
    mapping(address => User) public users;
    // 卖家地址
    address public seller;
    // 注册成为卖家所需要的ETH
    uint public sellerRegistrationFee = 1 ether;

    // 唯一商品id
    uint public nextProductId;
    // 商品映射
    mapping(uint => Product) public products;

    // 唯一订单id
    uint public nextOrderId;
    // 订单映射
    mapping(uint => Order) private orders;
    // 用户订单映射
    mapping(address => uint[]) private ordersByBuyer;

    // 愿望清单
    mapping(address => uint[]) private washList;

    // 只能被卖家调用
    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this function");
        _;
    }

    // 只能被买家调用
    modifier onlyBuyer() {
        require(users[msg.sender].registered == true && msg.sender != seller, "Only buyer can call this function");
        _;
    }

    // 买家注册
    function registerBuyer(string memory _name, string memory _email, string memory _addr) public {
        // 买家不允许卖家参与
        require(msg.sender != seller, "Sellers cannot register as buyers");
        // 买家不能重复注册
        require(users[msg.sender].registered == false, "Buyer already registered");
        // 约束买家信息
        require(bytes(_name).length > 0, "Buyer name cannot be empty");
        require(bytes(_email).length > 0, "Buyer email cannot be empty");
        require(bytes(_addr).length > 0, "Buyer address cannot be empty");

        // 买家注册成功
        users[msg.sender] = User(_name, _email, _addr, true);
    }

    // 买家更新资料
    function updateBuyer(string memory _name, string memory _email, string memory _addr) public {
        // 获得买家信息
        User storage buyer = users[msg.sender];
        // 买家必须已经注册
        require(buyer.registered == true, "The buyer must be already registered");
        // 约束买家信息
        require(bytes(_name).length > 0, "Buyer name cannot be empty");
        require(bytes(_email).length > 0, "Buyer email cannot be empty");
        require(bytes(_addr).length > 0, "Buyer address cannot be empty");

        // 更新买家信息
        buyer.name = _name;
        buyer.email = _email;
        buyer.addr = _addr;
    }

    // 卖家注册
    function registerSeller(string memory _name, string memory _email, string memory _addr) payable public {
        // 卖家只能注册一个
        require(seller == address(0), "Seller can only exist as one");
        // 卖家注册不允许买家参与
        require(users[msg.sender].registered == false, "buyer cannot register as Seller");
        // 注册卖家需要存入一定数量的ETH
        require(msg.value == sellerRegistrationFee, "Incorrect registration fee");
        // 约束卖家信息
        require(bytes(_name).length > 0, "Seller name cannot be empty");
        require(bytes(_email).length > 0, "Seller email cannot be empty");
        require(bytes(_addr).length > 0, "Seller address cannot be empty");

        // 卖家注册成功
        seller = msg.sender;
        users[msg.sender] = User(_name, _email, _addr, true);
    }

    // 添加商品
    function addProduct(string memory _name, uint _price, uint _stock) public onlySeller {
        // 约束商品名称、价格、库存
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(_price >= 0, "Product price cannot be less than 0");
        require(_stock >= 0, "Product stock cannot be less than 0");

        // 添加商品
        products[nextProductId] = Product(nextProductId, _name, _price, _stock);
        // 唯一商品ID自增
        nextProductId++;
    }

    // 更新商品
    function updateProduct(uint _id, string memory _name, uint _price, uint _stock) public onlySeller {
        // 商品ID必须存在
        require(_id < nextProductId, "Product ID cannot be empty");
        // 约束商品名称、价格、库存
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(_price >= 0, "Product price cannot be less than 0");
        require(_stock >= 0, "Product stock cannot be less than 0");

        // 取得商品详情
        Product storage product = products[_id];
        // 更新商品数据
        product.name = _name;
        product.price = _price;
        product.stock = _stock;
    }

    // 获取库存大于0的商品列表
    function getProductList() public view returns (Product[] memory) {
        // 统计满足条件的商品数量
        uint count = 0;
        for (uint i = 0;i < nextProductId;i++) {
            if (products[i].stock > 0) {
                count++;
            }
        }

        // 根据商品数量创建定长内存数组
        Product[] memory list = new Product[](count);
        uint index = 0;
        // 再次遍历，将符合条件的商品添加到数组
        for (uint i = 0;i < nextProductId;i++) {
            // 如果库存大于0，则添加到数组
            if (products[i].stock > 0) {
                list[index] = products[i];
                index++;
            }
        }

        return list;
    }

    // 获取指定商品详情
    function getProductById(uint _id) public view returns (Product memory) {
        return products[_id];
    }

    // 添加ID到愿望清单
    function addToWashList(uint _id) public {
        // 商品ID必须存在
        require(_id < nextProductId, "Product ID cannot be empty");

        // 添加到愿望清单
        washList[msg.sender].push(_id);
    }

    // 从愿望清单中移除ID
    function removeFromWashList(uint _id) public {
        // 商品ID必须存在
        require(_id < nextProductId, "Product ID cannot be empty");

        // 遍历愿望清单，找到对应的商品ID，删除
        for (uint i = 0;i < washList[msg.sender].length;i++) {
            // 找到对应的商品ID，删除
            if (washList[msg.sender][i] == _id) {
                // 把数组最后一位复制过来
                washList[msg.sender][i] = washList[msg.sender][washList[msg.sender].length - 1];
                // 再移除最后一位，实现remove元素的目的
                washList[msg.sender].pop();
            }
        }
    }

    // 获取自己的愿望清单列表
    function getWashList() public view returns (Product[] memory) {
        uint[] memory washIds = washList[msg.sender];

        // 创建定长内存数组
        Product[] memory list = new Product[](washIds.length);
        for (uint i = 0;i < washIds.length;i++) {
            // 添加商品到数组
            list[i] = products[washIds[i]];
        }

        return list;
    } 

    // 买家购买商品
    function startTrade(uint _id, uint _count) public payable onlyBuyer {
        // 商品ID必须存在
        require(_id < nextProductId, "Product ID cannot be empty");
        // 下单数量必须大于0
        require(_count > 0, "Product count cannot be less than 0");
        // 获取商品详情
        Product storage product = products[_id];
        // 商品库存必须充足
        require(product.stock >= _count, "Out of stock");
        // 买家付款金额金额 = 商品价格 * 下单数量
        require(msg.value == product.price * _count, "Incorrect payment amount");

        // 创建交易订单
        orders[nextOrderId] = Order(seller, msg.sender, product, _count, Status.Paid);
        // 添加交易ID到该用户的订单记录中
        ordersByBuyer[msg.sender].push(nextOrderId);
        // 商品库存-1
        product.stock -= _count;
        // 订单ID自增
        nextOrderId++;
    }

    // 买家只能查看自己的交易订单
    function getMyOrders() public onlyBuyer view returns (Order[] memory) {
        // 获取用户订单列表
        uint[] memory orderIds = ordersByBuyer[msg.sender];

        // 创建定长内存数组
        Order[] memory list = new Order[](orderIds.length);
        for (uint i = 0;i < orderIds.length;i++) {
            // 添加订单到数组
            list[i] = orders[orderIds[i]];
        }

        return list;
    }

    // 卖家可以查看所有交易订单
    function getAllOrders() public onlySeller view returns (Order[] memory) {
        // 创建定长内存数组
        Order[] memory list = new Order[](nextOrderId);
        for (uint i = 0;i < nextOrderId;i++) {
            // 添加订单到数组
            list[i] = orders[i];
        }

        return list;
    }

    // 买家申请退货
    function applyRefund(uint _id) public onlyBuyer {
        // 订单必须存在
        require(_id < nextOrderId, "Order ID cannot be empty");
        // 订单必须处于已付款状态
        require(orders[_id].status == Status.Paid, "The order must be in a paid status");
        // 买家只能操作自己的订单
        require(orders[_id].buyer == msg.sender, "Only able to operate on one's own orders");

        // 更新订单状态为退货待批准
        orders[_id].status = Status.PendingApproval;
    }

    // 卖家获取待批准列表
    function getPendingApprovalList() public onlySeller view returns (Order[] memory) {
        // 统计符合条件订单数量
        uint count = 0;
        for (uint i = 0;i < nextOrderId;i++) {
            if (orders[i].status == Status.PendingApproval) {
                count++;
            }
        }

        // 创建定长内存数组
        Order[] memory list = new Order[](count);
        uint index = 0;
        for (uint i = 0;i < nextOrderId;i++) {
            if (orders[i].status == Status.PendingApproval) {
                // 添加订单到数组
                list[index] = orders[i];
                index++;
            }
        }

        return list;
    }

    // 卖家批准退货
    function approveRefund(uint _id) public onlySeller {
        // 订单ID必须存在
        require(_id < nextOrderId, "Order ID cannot be empty");
        // 订单必须处于退货待批准状态
        require(orders[_id].status == Status.PendingApproval, "The order must be in a pending approval status");

        // 更新订单状态为已退货
        orders[_id].status = Status.Returned;

        // 返还买家货款
        payable(orders[_id].buyer).transfer(orders[_id].product.price * orders[_id].quantity);

        // 商品库存增加
        Product storage product = products[orders[_id].product.productId];
        product.stock += 1;
    }

    // 买家标记交易完成
    function completed(uint _id) public onlyBuyer {
        // 订单ID必须存在
        require(_id < nextOrderId, "Order ID cannot be empty");
        // 订单必须处于已付款状态
        require(orders[_id].status == Status.Paid, "The order must be in a paid status");

        // 标记已完成
        orders[_id].status = Status.Completed;

        // 卖家获得交易金额
        payable(seller).transfer(orders[_id].product.price * orders[_id].quantity);
    }
}