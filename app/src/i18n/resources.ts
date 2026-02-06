export const resources = {
  vi: {
    translation: {
      homepage: {
        welcome: "Chào mừng đến với BoardGame Hub",
        welcome_back: "Chào mừng quay lại, {{name}}",
        subtitle: "Nơi kết nối người chơi board game trực tuyến"
      },
      welcome_section: {
        enter_name: "Nhập tên của bạn",
        name_placeholder: "Tên người chơi",
        name_required: "Vui lòng nhập và lưu tên trước khi tiếp tục.",
        name_invalid: "Tên không hợp lệ (không được chỉ là dấu ngoặc kép).",
        save: "Lưu",
        edit: "Sửa"
      },
      join_room: {
        title: "Tham gia phòng",
        paste_url_placeholder: "Dán liên kết phòng",
        join_button: "Tham gia",
        spectator_label: "Tham gia với tư cách khán giả",
        invalid_url: "Liên kết phòng không hợp lệ"
      },
      game_list: {
        title: "Danh sách tất cả game",
        search_placeholder: "Tìm kiếm trò chơi…",
        filters: "Bộ lọc",
        clear_all: "Xóa tất cả",
        player_count: "Số người chơi",
        playtime: "Thời gian chơi",
        complexity: "Độ phức tạp",
        category: "Thể loại",
        apply: "Áp dụng",
        reset: "Đặt lại",
        playtime_lt_30: "<30 phút",
        playtime_30_60: "30-60 phút",
        playtime_60_120: "60-120 phút",
        playtime_gt_120: ">120 phút",
        complexity_light: "Nhẹ",
        complexity_medium: "Trung bình",
        complexity_heavy: "Nặng",
        players_label: "{{min}}-{{max}} người chơi",
        players_label_plus: "{{min}}+ người chơi",
        playtime_label: "{{min}}-{{max}} phút",
        playtime_label_plus: "> {{min}} phút",
        prev: "Trước",
        next: "Tiếp",
        page_indicator: "Trang {{current}} / {{total}}",
        no_games: "Không có game nào"
      },
      sidebar: {
        title: "BoardGame Hub",
        recent_rooms: "Phòng gần đây",
        settings: "Cài đặt",
        help: "Trợ giúp",
        about: "Giới thiệu"
      },
      language_toggle: {
        label: "Ngôn ngữ",
        vietnamese: "Tiếng Việt",
        english: "Tiếng Anh"
      },
      language_selection: {
        label: "Ngôn ngữ",
        vietnamese: "Tiếng Việt",
        english: "Tiếng Anh"
      },
      theme_toggle: {
        label: "Chế độ giao diện",
        light: "Sáng",
        dark: "Tối"
      },
      recent_games: {
        title: "Phòng gần đây",
        resume: "Tiếp tục",
        clear_all: "Xóa tất cả",
        no_recent: "Chưa có phòng nào",
        time_ago: "{{time}} trước",
        player_count: "{{count}} người chơi"
      },
      create_room: {
        title: "Tạo phòng mới",
        select_game: "Chọn game"
      },
      create_room_modal: {
        essentials: "Thiết yếu",
        players: "Số người chơi",
        playtime: "Thời lượng",
        settings_button: "Cài đặt",
        advanced_settings: "Cài đặt nâng cao",
        enable_expansions: "Bật mở rộng",
        back: "Quay lại",
        create: "Tạo phòng"
      },
      room_created: {
        title: "Phòng đã được tạo",
        share_url_label: "Link mời",
        copy_button: "Sao chép",
        copy_success: "Đã sao chép link mời!",
        helper_text: "Gửi link này để mời bạn bè vào phòng chơi.",
        enter_room: "Vào phòng",
        later: "Để sau"
      },
      settings: {
        title: "Cài đặt",
        language: "Ngôn ngữ",
        theme: "Chế độ giao diện",
        dark: "Tối",
        light: "Sáng",
        chat_settings: "Cài đặt chat",
        show_conversation: "Hiển thị hội thoại",
        show_game_events: "Hiển thị sự kiện game",
        clear_data: "Xóa dữ liệu",
        clear_data_confirm: "Bạn chắc chắn muốn xóa tất cả dữ liệu?",
        close: "Đóng",
        confirm: "Xác nhận",
        cancel: "Hủy"
      },
      nav: {
        menu_toggle: "Mở menu",
        settings: "Cài đặt",
        help: "Trợ giúp",
        about: "Về chúng tôi"
      },
      errors: {
        connection_failed: "Kết nối thất bại",
        invalid_url: "Liên kết phòng không hợp lệ",
        game_not_found: "Game không tìm thấy"
      },
      navigation: {
        leave_room_confirm: "Bạn đang ở trong một phòng. Bạn có muốn rời phòng và tham gia phòng mới không?"
      },
      gameroom: {
        title: "Phòng chơi: {{gameName}}",
        room_id: "Room: {{roomId}}",
        copy_room_id: "Sao chép link mời",
        copy_success: "Đã sao chép link mời!",
        host_badge: "Host",
        peer_badge: "Peer",
        connection_connected: "🟢 Đã kết nối",
        connection_reconnecting: "🟡 Đang kết nối lại",
        connection_offline: "🔴 Mất kết nối",
        role_become_spectator: "Làm khán giả",
        role_join_as_player: "Tham gia",
        role_become_spectator_short: "Khán giả",
        role_join_as_player_short: "Tham gia",
        system_became_spectator: "Bạn đã chuyển sang vai trò khán giả",
        system_became_player: "Bạn đã tham gia với vai trò người chơi",
        settings: "Cài đặt",
        leave: "Rời phòng",
        board: "Bàn chơi",
        phase_setup: "Setup",
        phase_playing: "Playing",
        phase_finished: "Finished",
        board_placeholder: "Khu vực bàn chơi (placeholder)",
        side_sheet: "Bảng bên",
        toggle_side_sheet: "Thu gọn/Mở rộng",
        participants: "Thành viên",
        players: "Người chơi ({{count}})",
        spectators: "Khán giả ({{count}})",
        no_spectators: "Chưa có khán giả",
        chat: "Chat",
        chat_placeholder: "Nhập tin nhắn…",
        send: "Gửi",
        spectator_label: "[Khán giả] {{name}}",
        me: "tôi",
        open_chat: "Mở chat",
        open_participants: "Mở danh sách thành viên",
        close: "Đóng",
        system_joined: "Bạn đã tham gia phòng",
        system_user_joined: "{{name}} đã tham gia phòng",
        system_user_left: "{{name}} đã rời phòng",
        system_user_became_spectator: "{{name}} đã chuyển sang vai trò khán giả",
        system_user_became_player: "{{name}} đã tham gia với vai trò người chơi"
      }
    }
  },
  en: {
    translation: {
      homepage: {
        welcome: "Welcome to BoardGame Hub",
        welcome_back: "Welcome back, {{name}}",
        subtitle: "Connect with online board game players"
      },
      welcome_section: {
        enter_name: "Enter your name",
        name_placeholder: "Player name",
        name_required: "Please enter and save your name before continuing.",
        name_invalid: "Invalid name (must not be quotes only).",
        save: "Save",
        edit: "Edit"
      },
      join_room: {
        title: "Join room",
        paste_url_placeholder: "Paste room URL",
        join_button: "Join",
        spectator_label: "Join as spectator",
        invalid_url: "Invalid room URL"
      },
      game_list: {
        title: "All available games",
        search_placeholder: "Search games…",
        filters: "Filters",
        clear_all: "Clear all",
        player_count: "Player count",
        playtime: "Playtime",
        complexity: "Complexity",
        category: "Category",
        apply: "Apply",
        reset: "Reset",
        playtime_lt_30: "<30 min",
        playtime_30_60: "30-60 min",
        playtime_60_120: "60-120 min",
        playtime_gt_120: ">120 min",
        complexity_light: "Light",
        complexity_medium: "Medium",
        complexity_heavy: "Heavy",
        players_label: "{{min}}-{{max}} players",
        players_label_plus: "{{min}}+ players",
        playtime_label: "{{min}}-{{max}} min",
        playtime_label_plus: "> {{min}} min",
        prev: "Prev",
        next: "Next",
        page_indicator: "Page {{current}} of {{total}}",
        no_games: "No games available"
      },
      sidebar: {
        title: "BoardGame Hub",
        recent_rooms: "Recent rooms",
        settings: "Settings",
        help: "Help",
        about: "About"
      },
      language_toggle: {
        label: "Language",
        vietnamese: "Vietnamese",
        english: "English"
      },
      language_selection: {
        label: "Language",
        vietnamese: "Vietnamese",
        english: "English"
      },
      theme_toggle: {
        label: "Theme",
        light: "Light",
        dark: "Dark"
      },
      recent_games: {
        title: "Recent rooms",
        resume: "Resume",
        clear_all: "Clear all",
        no_recent: "No recent rooms",
        time_ago: "{{time}} ago",
        player_count: "{{count}} players"
      },
      create_room: {
        title: "Create new room",
        select_game: "Select game"
      },
      create_room_modal: {
        essentials: "Essentials",
        players: "Players",
        playtime: "Playtime",
        settings_button: "Settings",
        advanced_settings: "Advanced settings",
        enable_expansions: "Enable expansions",
        back: "Back",
        create: "Create Room"
      },
      room_created: {
        title: "Room created",
        share_url_label: "Share URL",
        copy_button: "Copy",
        copy_success: "Link copied!",
        helper_text: "Share this link to invite friends.",
        enter_room: "Enter room",
        later: "Later"
      },
      settings: {
        title: "Settings",
        language: "Language",
        theme: "Theme",
        dark: "Dark",
        light: "Light",
        connection_connected: "🟢 Connected",
        connection_reconnecting: "🟡 Reconnecting",
        connection_offline: "🔴 Offline",
        role_become_spectator: "Become spectator",
        role_join_as_player: "Join as player",
        role_become_spectator_short: "Spectator",
        role_join_as_player_short: "Join",
        system_became_spectator: "You became a spectator",
        system_became_player: "You joined as a player",
        chat_settings: "Chat settings",
        show_conversation: "Show conversation",
        show_game_events: "Show game events",
        clear_data: "Clear data",
        clear_data_confirm: "Are you sure you want to clear all data?",
        close: "Close",
        confirm: "Confirm",
        cancel: "Cancel"
      },
      nav: {
        menu_toggle: "Open menu",
        settings: "Settings",
        help: "Help",
        about: "About"
      },
      errors: {
        connection_failed: "Connection failed",
        invalid_url: "Invalid room URL",
        game_not_found: "Game not found"
      },
      navigation: {
        leave_room_confirm: "You're currently in a room. Do you want to leave and join a new room?"
      },
      gameroom: {
        title: "Room: {{gameName}}",
        room_id: "Room: {{roomId}}",
        copy_room_id: "Copy invite link",
        copy_success: "Invite link copied!",
        host_badge: "Host",
        peer_badge: "Peer",
        connection_connected: "🟢 Connected",
        connection_reconnecting: "🟡 Reconnecting",
        connection_offline: "🔴 Offline",
        role_become_spectator: "Become spectator",
        role_join_as_player: "Join as player",
        role_become_spectator_short: "Spectator",
        role_join_as_player_short: "Join",
        settings: "Settings",
        leave: "Leave",
        board: "Board",
        phase_setup: "Setup",
        phase_playing: "Playing",
        phase_finished: "Finished",
        board_placeholder: "Game board area (placeholder)",
        side_sheet: "Side sheet",
        toggle_side_sheet: "Collapse/expand",
        participants: "Participants",
        players: "Players ({{count}})",
        spectators: "Spectators ({{count}})",
        no_spectators: "No spectators",
        chat: "Chat",
        chat_placeholder: "Type a message…",
        send: "Send",
        spectator_label: "[Spectator] {{name}}",
        me: "me",
        open_chat: "Open chat",
        open_participants: "Open participants",
        close: "Close",
        system_joined: "You joined the room",
        system_user_joined: "{{name}} joined the room",
        system_user_left: "{{name}} left the room",
        system_user_became_spectator: "{{name}} became a spectator",
        system_user_became_player: "{{name}} joined as a player"
      }
    }
  }
} as const;
