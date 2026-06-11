import {
  ArrowLeftOutlined,
  AudioMutedOutlined,
  AudioOutlined,
  CloseCircleOutlined,
  CompressOutlined,
  DeleteOutlined,
  ExpandOutlined,
  GoogleOutlined,
  LogoutOutlined,
  PauseCircleOutlined,
  PhoneOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  SoundOutlined,
  VideoCameraAddOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Slider,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { API_BASE_URL, getApiErrorMessage } from "../services/api";
import { getWebRTCConfig } from "../services/authService";
import {
  closeRoom,
  deleteRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  listRoomChats,
} from "../services/roomService";
import roomSocket from "../services/socket";
import { getUser } from "../stores/authStore";
import { formatDateTime, getRoomCode } from "../utils/format";

const { Paragraph, Title, Text } = Typography;

function mergeMember(members, member) {
  if (!member?.id) return members;
  const without = members.filter((item) => item.id !== member.id);
  return [...without, member];
}

function formatSeconds(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const rest = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function formatBytes(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}

function sanitizeICEServers(servers) {
  if (!Array.isArray(servers)) return [];
  return servers.map((entry) => {
    const urls = Array.isArray(entry?.urls) ? entry.urls : typeof entry?.urls === 'string' ? [entry.urls] : []
    // If entry has turn/turns URL but missing username or credential, remove those URLs
    const needsCreds = urls.some((u) => u.startsWith('turn:') || u.startsWith('turns:'))
    if (needsCreds && (!entry.username || !entry.credential)) {
      // Keep only STUN URLs from this entry
      const stunOnly = urls.filter((u) => u.startsWith('stun:') || u.startsWith('stuns:'))
      return stunOnly.length > 0 ? { urls: stunOnly } : null
    }
    return entry
  }).filter(Boolean)
}

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "http://localhost:8080";
  }
}

function resolveVideoURL(url) {
  if (!url) return "";
  if (url.startsWith("/proxy/")) {
    return `${getApiOrigin()}${url}`;
  }
  return url;
}

function normalizeDriveError(error) {
  if (!error) return null;

  const code = error.code || "drive_proxy_failed";
  const defaults = {
    drive_quota_exceeded: {
      title: "Google Drive membatasi file ini",
      message:
        "File ini terkena limit view/download atau terlalu sering diakses dari server.",
      suggestion:
        "Upload atau copy file ke Drive kamu sendiri, pastikan Anyone with the link sebagai Viewer, lalu ganti link movie.",
    },
    drive_file_not_public: {
      title: "File Drive tidak bisa diakses publik",
      message:
        "File kemungkinan private, butuh login, atau sharing belum disetel publik.",
      suggestion:
        "Ubah akses sharing menjadi Anyone with the link sebagai Viewer.",
    },
    drive_confirm_failed: {
      title: "Konfirmasi download Google Drive gagal",
      message:
        "Google Drive menampilkan halaman konfirmasi, tetapi link download final tidak berhasil dipakai.",
      suggestion:
        "Buka link Drive langsung, klik Tetap download, atau upload/copy file ke Drive kamu sendiri lalu gunakan link baru.",
    },
    drive_caching: {
      title: "Film sedang didownload ke server",
      message:
        "Film belum siap ditonton karena server sedang mengambil file dari Google Drive.",
      suggestion:
        "Tunggu sampai proses download selesai. Setelah siap, semua peserta akan streaming dari server.",
    },
    drive_proxy_failed: {
      title: "Video Google Drive gagal dimuat",
      message: "Server gagal mengambil video dari Google Drive.",
      suggestion:
        "Coba muat ulang. Jika tetap gagal, gunakan link Drive lain atau upload/copy file ke Drive kamu sendiri.",
    },
  };

  const fallback = defaults[code] || defaults.drive_proxy_failed;
  return {
    code,
    title: error.title || fallback.title,
    message: error.message || fallback.message,
    suggestion: error.suggestion || fallback.suggestion,
  };
}

function getRoomStatusLabel(status) {
  if (status === "playing") return "started";
  return status || "-";
}

function getRoomStatusColor(status) {
  if (status === "waiting") return "gold";
  if (status === "playing") return "green";
  if (status === "paused") return "blue";
  if (status === "ended") return "red";
  return "purple";
}

export default function RoomDetailPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [playerState, setPlayerState] = useState({
    current_time: 0,
    is_playing: false,
    user_name: "",
  });
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimerRef = useRef(null);
  const [chatForm] = Form.useForm();
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [camActive, setCamActive] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [activeCams, setActiveCams] = useState(new Set());
  const [onlineMembers, setOnlineMembers] = useState(new Set());
  const [availableDevices, setAvailableDevices] = useState({
    video: [],
    audio: [],
  });
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const currentUser = getUser();
  const [videoError, setVideoError] = useState("");
  const [driveError, setDriveError] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [cacheProgress, setCacheProgress] = useState(null);
  const [videoRetryKey, setVideoRetryKey] = useState(0);
  const [joinGateOpen, setJoinGateOpen] = useState(false);
  const [joinGateLoading, setJoinGateLoading] = useState(false);
  const [joinGateForm] = Form.useForm();
  const videoWrapperRef = useRef(null);
  const videoRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // My outgoing peers (I offered): keyed by targetUserID
  const answerPeersRef = useRef({}); // Incoming peers (they offered): keyed by senderUserID
  const iceServersRef = useRef([]);
  const membersRef = useRef([]);
  const chatsEndRef = useRef(null);
  const camActiveRef = useRef(false);
  const videoErrorRef = useRef(false);
  const videoRetryCountRef = useRef(0);
  const videoRetryTimerRef = useRef(null);
  const pendingIceRef = useRef({});
  const roomRef = useRef(null);
  const lastSyncRef = useRef(null);
  const restartCooldownsRef = useRef({});
  const answerTimerRef = useRef({});

  // Keep roomRef in sync with latest room state so socket callbacks always see current value
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // When cam is turned on, ensure the local video element gets the stream
  useEffect(() => {
    if (camActive && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [camActive]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === videoWrapperRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Helper: scroll chat ke bawah
  const scrollChatDown = () => {
    setTimeout(() => {
      chatsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const loadRoom = async () => {
    setError("");
    setLoading(true);

    try {
      const [roomData, chatResult] = await Promise.all([
        getRoom(code),
        listRoomChats(code, { page: 1, per_page: 50 }),
      ]);
      setRoom(roomData);
      setMembers(roomData.members ?? []);
      membersRef.current = roomData.members ?? [];
      setChats([...chatResult.data].reverse());
      setPlayerState({
        current_time: roomData.current_time ?? 0,
        is_playing: roomData.is_playing ?? false,
        user_name: "",
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Gagal memuat detail room"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function fetchInitialRoom() {
      try {
        const [roomData, chatResult, rtcConfig] = await Promise.all([
          getRoom(code),
          listRoomChats(code, { page: 1, per_page: 50 }),
          getWebRTCConfig(),
        ]);

        if (!active) return;

        setRoom(roomData);
        setMembers(roomData.members ?? []);
        membersRef.current = roomData.members ?? [];
        setChats([...chatResult.data].reverse());
        setPlayerState({
          current_time: roomData.current_time ?? 0,
          is_playing: roomData.is_playing ?? false,
          user_name: "",
        });
        iceServersRef.current = sanitizeICEServers(rtcConfig?.ice_servers ?? []);
        scrollChatDown();
      } catch (err) {
        if (active)
          setError(getApiErrorMessage(err, "Gagal memuat detail room"));
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchInitialRoom();

    return () => {
      active = false;
    };
  }, [code]);

  // --- WebRTC helpers ---
  function closeAllPeers() {
    Object.values(peersRef.current).forEach((peer) => peer.close());
    peersRef.current = {};
    Object.values(answerPeersRef.current).forEach((peer) => peer.close());
    answerPeersRef.current = {};
  }

  function removePeerForUser(userID) {
    if (peersRef.current[userID]) {
      peersRef.current[userID].close();
      delete peersRef.current[userID];
    }
    if (answerPeersRef.current[userID]) {
      answerPeersRef.current[userID].close();
      delete answerPeersRef.current[userID];
    }
    delete pendingIceRef.current[userID];
  }

  function queueIceCandidate(userID, candidate) {
    if (!pendingIceRef.current[userID]) pendingIceRef.current[userID] = [];
    pendingIceRef.current[userID].push(candidate);
  }

  async function flushPendingIce(userID, peer) {
    const candidates = pendingIceRef.current[userID] || [];
    delete pendingIceRef.current[userID];
    for (const candidate of candidates) {
      await peer.addIceCandidate(candidate);
    }
  }

  // Auto-restart ICE when connection fails
  async function restartPeerConnection(targetUserID) {
    const now = Date.now();
    const last = restartCooldownsRef.current[targetUserID] || 0;
    if (now - last < 8000) return; // max 1 attempt per 8s per user
    restartCooldownsRef.current[targetUserID] = now;

    if (peersRef.current[targetUserID]) {
      // I am the offerer — close + recreate, send new offer
      peersRef.current[targetUserID].close();
      delete peersRef.current[targetUserID];
      delete pendingIceRef.current[targetUserID];
      const peer = createOutgoingPeer(targetUserID);
      try {
        const offer = await peer.createOffer({ iceRestart: true });
        await peer.setLocalDescription(offer);
        roomSocket.send("webrtc:offer", {
          target_user_id: targetUserID,
          sdp: offer.sdp,
        });
      } catch {
        // error already handled by connectionstatechange
      }
    } else if (answerPeersRef.current[targetUserID]) {
      // I am the answerer — close local, ask remote to restart
      answerPeersRef.current[targetUserID].close();
      delete answerPeersRef.current[targetUserID];
      delete pendingIceRef.current[targetUserID];
      roomSocket.send("webrtc:restart", { target_user_id: targetUserID });
    }
  }

  // Create a peer connection where **I am the offerer**
  // local tracks are added automatically if localStreamRef is set
  function createOutgoingPeer(targetUserID) {
    // Close existing peer if any
    if (peersRef.current[targetUserID]) {
      peersRef.current[targetUserID].close();
    }

    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });

    // Add my local tracks
    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => peer.addTrack(track, localStreamRef.current));
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        roomSocket.send("webrtc:ice", {
          target_user_id: targetUserID,
          candidate: JSON.stringify(event.candidate),
        });
      }
    };

    peer.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!stream) return;
      // Monitor tracks — auto-remove on track end
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          setRemoteStreams((current) =>
            current.filter((s) => s.userID !== targetUserID),
          );
        };
      });
      setRemoteStreams((current) => {
        const idx = current.findIndex((item) => item.userID === targetUserID);
        if (idx >= 0) {
          const updated = [...current];
          updated[idx] = { ...updated[idx], stream };
          return updated;
        }
        const member = membersRef.current.find((m) => m.id === targetUserID);
        return [
          ...current,
          { userID: targetUserID, stream, userName: member?.name || targetUserID },
        ];
      });
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setActionError("");
      } else if (peer.connectionState === "failed") {
        setActionError("Koneksi terputus. Mencoba sambungkan ulang...");
        setTimeout(() => restartPeerConnection(targetUserID), 1500);
      }
    };

    peersRef.current[targetUserID] = peer;

    // Connection timeout — auto-restart if not connected within 15s
    const connTimer = setTimeout(() => {
      if (peer.connectionState === "connecting" || peer.connectionState === "new") {
        restartPeerConnection(targetUserID);
      }
    }, 15000);
    // Clear timer on state change that resolves
    const origStateChange = peer.onconnectionstatechange;
    peer.onconnectionstatechange = (...args) => {
      if (peer.connectionState === "connected" || peer.connectionState === "failed") {
        clearTimeout(connTimer);
      }
      origStateChange.apply(peer, args);
    };

    return peer;
  }

  // I start my camera/mic
  async function startMyCam(camId, micId) {
    try {
      const constraints = {
        video: camId ? { deviceId: { exact: camId } } : { facingMode: "user" },
        audio: micId ? { deviceId: { exact: micId } } : true,
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        if (
          err?.name !== "NotFoundError" &&
          err?.name !== "OverconstrainedError"
        )
          throw err;
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }

      // Boost mic volume via AudioContext GainNode
      try {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(stream);
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 2.5; // boost volume
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(gainNode).connect(dest);
          // Keep the original video track, replace audio with boosted version
          const videoTrack = stream.getVideoTracks()[0];
          const boostedStream = new MediaStream([videoTrack, ...dest.stream.getAudioTracks()].filter(Boolean));
          localStreamRef.current = boostedStream;
          // Store AudioContext ref so we can clean up later
          window.__nobarkanAudioCtx = audioCtx;
        } else {
          localStreamRef.current = stream;
        }
      } catch {
        localStreamRef.current = stream;
      }
      camActiveRef.current = true;
      setCamActive(true);
      setMicMuted(false);
      setShowDevicePicker(false);

      // Notify others
      roomSocket.send("webrtc:start", {});

      // Create peer + offer to all other members
      const targets = membersRef.current.filter(
        (m) => m.id !== currentUser?.id,
      );
      for (const member of targets) {
        const peer = createOutgoingPeer(member.id);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        roomSocket.send("webrtc:offer", {
          target_user_id: member.id,
          sdp: offer.sdp,
        });
      }
    } catch (err) {
      setActionError(
        getApiErrorMessage(err, "Tidak bisa mengaktifkan kamera/mic"),
      );
    }
  }

  async function enumerateDevices() {
    // Browser tidak mengizinkan mediaDevices di HTTP (non-HTTPS)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setActionError(
        "Browser tidak mendukung akses kamera di halaman HTTP. Gunakan HTTPS atau localhost.",
      );
      return;
    }
    try {
      // Request permission first so enumerateDevices returns device labels
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        // Stop temporary stream immediately — we only needed it for permission
        tempStream.getTracks().forEach((track) => track.stop());
      } catch {
        // Permission denied or no devices - continue to enumerate anyway
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      const audioDevices = devices.filter((d) => d.kind === "audioinput");
      setAvailableDevices({ video: videoDevices, audio: audioDevices });
      if (videoDevices.length > 0 && !selectedVideoDevice)
        setSelectedVideoDevice(videoDevices[0].deviceId);
      if (audioDevices.length > 0 && !selectedAudioDevice)
        setSelectedAudioDevice(audioDevices[0].deviceId);
    } catch {
      // ignore enumeration errors
    }
  }

  function handleStartCamClick() {
    if (!socketReady) {
      setActionError(
        "Tunggu sampai koneksi real-time aktif sebelum menyalakan kamera.",
      );
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setActionError(
        "Browser tidak mendukung akses kamera di halaman HTTP. Gunakan HTTPS atau localhost.",
      );
      return;
    }
    enumerateDevices();
    setShowDevicePicker(true);
  }

  function handleConfirmCam() {
    startMyCam(selectedVideoDevice, selectedAudioDevice);
  }

  // I stop my camera/mic
  function stopMyCam() {
    roomSocket.send("webrtc:stop", {});

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (window.__nobarkanAudioCtx) {
      window.__nobarkanAudioCtx.close().catch(() => {});
      delete window.__nobarkanAudioCtx;
    }

    closeAllPeers();
    camActiveRef.current = false;
    setCamActive(false);
    // Remove remote streams that belong to peers I initiated
    // (They will also be removed when they stop their cam or disconnect)
  }

  // Toggle mic
  function toggleMic() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  }

  // --- Remote WebRTC handlers ---
  async function handleRemoteOffer(payload) {
    if (!payload?.sender_user_id) return;

    const senderID = payload.sender_user_id;

    // Close existing answer peer if any
    if (answerPeersRef.current[senderID]) {
      answerPeersRef.current[senderID].close();
    }

    // Also if I have an outgoing peer to this user (because we both have cam on),
    // we keep both separate connections.
    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });

    // If I also have cam on, add my tracks so we can have bidirectional
    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => peer.addTrack(track, localStreamRef.current));
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        roomSocket.send("webrtc:ice", {
          target_user_id: senderID,
          candidate: JSON.stringify(event.candidate),
        });
      }
    };

    peer.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!stream) return;
      // Monitor tracks — auto-remove on track end
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          setRemoteStreams((current) =>
            current.filter((s) => s.userID !== senderID),
          );
        };
      });
      setRemoteStreams((current) => {
        const idx = current.findIndex((s) => s.userID === senderID);
        if (idx >= 0) {
          const updated = [...current];
          updated[idx] = { ...updated[idx], stream };
          return updated;
        }
        const member = membersRef.current.find((m) => m.id === senderID);
        return [
          ...current,
          {
            userID: senderID,
            stream,
            userName: member?.name || payload.sender_name || senderID,
          },
        ];
      });
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") {
        setActionError("");
      } else if (peer.connectionState === "failed") {
        setActionError("Koneksi terputus. Mencoba sambungkan ulang...");
        clearTimeout(answerTimerRef.current[senderID]);
        setTimeout(() => restartPeerConnection(senderID), 1500);
      }
    };
    // Connection timeout — auto-restart if answer peer stalls
    const timerId = setTimeout(() => {
      const p = answerPeersRef.current[senderID];
      if (p && (p.connectionState === "connecting" || p.connectionState === "new")) {
        restartPeerConnection(senderID);
      }
    }, 15000);
    // clear old timer for this user if any
    if (answerTimerRef.current[senderID]) clearTimeout(answerTimerRef.current[senderID]);
    answerTimerRef.current[senderID] = timerId;

    answerPeersRef.current[senderID] = peer;
    await peer.setRemoteDescription({ type: "offer", sdp: payload.sdp });
    await flushPendingIce(senderID, peer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    roomSocket.send("webrtc:answer", {
      target_user_id: senderID,
      sdp: answer.sdp,
    });
  }

  async function handleRemoteAnswer(payload) {
    const senderID = payload?.sender_user_id;
    const peer = peersRef.current[senderID];
    if (!peer) return;
    await peer.setRemoteDescription({ type: "answer", sdp: payload.sdp });
    await flushPendingIce(senderID, peer);
  }

  async function handleRemoteIce(payload) {
    const senderID = payload?.sender_user_id;
    if (!senderID || !payload?.candidate) return;

    const candidate =
      typeof payload.candidate === "string"
        ? JSON.parse(payload.candidate)
        : payload.candidate;
    let peer = peersRef.current[senderID];
    if (!peer) peer = answerPeersRef.current[senderID];

    if (!peer || !peer.remoteDescription) {
      queueIceCandidate(senderID, candidate);
      return;
    }

    await peer.addIceCandidate(candidate);
  }

  function stopCall() {
    closeAllPeers();
    pendingIceRef.current = {};
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    camActiveRef.current = false;
    setCamActive(false);
    setRemoteStreams([]);
    setActiveCams(new Set());
  }

  // Setup autoplay unlock — muted fallback then unmute-on-tap
  const setupAutoplayUnlock = (videoEl) => {
    if (!videoEl) return;
    // Step 1: muted autoplay — always works even on HTTP
    videoEl.muted = true;
    videoEl.play().catch(() => {});

    // Step 2: unmute on first user interaction
    const unmute = () => {
      videoEl.muted = false;
      document.removeEventListener("click", unmute);
      document.removeEventListener("touchstart", unmute);
      document.removeEventListener("keydown", unmute);
    };
    document.addEventListener("click", unmute, { once: true });
    document.addEventListener("touchstart", unmute, { once: true });
    document.addEventListener("keydown", unmute, { once: true });
  };

  // --- WebSocket lifecycle ---
  useEffect(() => {
    let active = true;

    async function connectSocket() {
      try {
        const joinResult = await joinRoom(code);
        if (!active) return;

        if (joinResult?.room?.members) {
          setMembers(joinResult.room.members);
          membersRef.current = joinResult.room.members;
        }

        roomSocket.connect(joinResult.ws_token);
      } catch {
        if (!active) return;
        setJoinGateOpen(true);
      }
    }

    const onOpen = () => {
      setSocketReady(true);
      setOnlineMembers((current) => {
        const next = new Set(current);
        if (currentUser?.id) next.add(currentUser.id);
        return next;
      });

      getRoom(code)
        .then((roomData) => {
          if (!roomData) return;
          setRoom(roomData);
          setMembers(roomData.members ?? []);
          membersRef.current = roomData.members ?? [];
        })
        .catch(() => {});

      const hostId = roomRef.current?.host?.id || roomRef.current?.host_id;
      if (hostId !== currentUser?.id) {
        setTimeout(() => roomSocket.send("player:request_sync"), 250);
      }
    };
    const onClose = () => {
      setSocketReady(false);
      setOnlineMembers(new Set());
    };

    const onChat = (chat) => {
      setChats((current) => [...current, chat]);
      scrollChatDown();
    };

    // --- Player sync ---
    // Host events: when host plays/pauses/seeks, non-host members follow
    const onPlayerSync = (payload) => {
      const networkOffset =
        payload.is_playing && payload.sent_at
          ? Math.min(0.1, Math.max(0, (Date.now() - payload.sent_at) / 1000))
          : 0;
      const targetTime = (Number(payload.current_time) || 0) + networkOffset;
      const nextPayload = { ...payload, current_time: targetTime };

      // Save to ref so handleVideoLoadedMetadata can replay if video wasn't ready yet
      lastSyncRef.current = nextPayload;

      setPlayerState(nextPayload);
      if (payload.room_status) {
        setRoom((current) =>
          current
            ? {
                ...current,
                status: payload.room_status,
                is_playing: !!payload.is_playing,
                current_time: targetTime,
              }
            : current,
        );
      }

      // Always apply time + play/pause on sync event (host seek/play/pause)
      if (videoRef.current) {
        if (Math.abs(videoRef.current.currentTime - targetTime) > 0.3) {
          videoRef.current.currentTime = targetTime;
        }
        if (payload.is_playing) {
          videoRef.current.play().catch((err) => {
            if (err.name === "NotAllowedError") {
              setupAutoplayUnlock(videoRef.current);
            }
          });
        } else {
          videoRef.current.pause();
        }
      }
    };

    const onPlayerSyncRequest = () => {
      const hostId = roomRef.current?.host?.id || roomRef.current?.host_id;
      if (hostId !== currentUser?.id) return;

      const currentTime = videoRef.current ? videoRef.current.currentTime : 0;
      const isPlaying = videoRef.current ? !videoRef.current.paused : false;
      roomSocket.send("player:seek", {
        current_time: currentTime,
        is_playing: isPlaying,
        sent_at: Date.now(),
      });
    };

    const onMemberJoin = (member) => {
      setMembers((current) => {
        const next = mergeMember(current, member);
        membersRef.current = next;
        return next;
      });
      setOnlineMembers((current) => {
        const next = new Set(current);
        if (member.id) next.add(member.id);
        return next;
      });
      // Auto-reconnect: if my cam is on, send offer to the new member
      if (camActiveRef.current && member.id !== currentUser?.id) {
        setTimeout(async () => {
          const peer = createOutgoingPeer(member.id);
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          roomSocket.send("webrtc:offer", {
            target_user_id: member.id,
            sdp: offer.sdp,
          });
        }, 500);
      }

      // Notify host to pause & play so member syncs correctly
      const hostId = roomRef.current?.host?.id || roomRef.current?.host_id;
      if (member.id !== currentUser?.id && hostId === currentUser?.id) {
        Modal.info({
          title: `${member.name || member.username || "Member"} bergabung`,
          content: "Pause lalu play lagi supaya video member tersinkron.",
          centered: true,
          okText: "Lanjutkan",
          autoFocusButton: "ok",
          onOk: () => {
            roomSocket.send("player:play", {
              current_time: videoRef.current?.currentTime || 0,
              is_playing: true,
              sent_at: Date.now(),
            });
            if (videoRef.current) videoRef.current.play().catch(() => {});
          },
        });
      }
    };

    const onMemberLeave = (member) => {
      setMembers((current) => {
        const next = current.filter((item) => item.id !== member.id);
        membersRef.current = next;
        return next;
      });
      setOnlineMembers((current) => {
        const next = new Set(current);
        next.delete(member.id);
        return next;
      });
      // Cleanup: remove their streams and peers
      setRemoteStreams((current) =>
        current.filter((s) => s.userID !== member.id),
      );
      removePeerForUser(member.id);
      setActiveCams((current) => {
        const next = new Set(current);
        next.delete(member.id);
        return next;
      });
    };

    // --- WebRTC events ---
    const onCamStart = (payload) => {
      if (payload?.user_id && payload.user_id !== currentUser?.id) {
        setActiveCams((current) => {
          const next = new Set(current);
          next.add(payload.user_id);
          return next;
        });
      }
    };

    const onCamStop = (payload) => {
      if (payload?.user_id) {
        setActiveCams((current) => {
          const next = new Set(current);
          next.delete(payload.user_id);
          return next;
        });
        // Remove their stream
        setRemoteStreams((current) =>
          current.filter((s) => s.userID !== payload.user_id),
        );
        removePeerForUser(payload.user_id);
      }
    };

    const onOffer = (payload) => handleRemoteOffer(payload);
    const onAnswer = (payload) => handleRemoteAnswer(payload);
    const onIce = (payload) => handleRemoteIce(payload);
    const onRestart = (payload) => {
      const targetID = payload?.target_user_id;
      if (targetID && peersRef.current[targetID]) {
        // Remote asked me (the offerer) to restart
        setTimeout(() => restartPeerConnection(targetID), 500);
      }
    };

    roomSocket.on("socket:open", onOpen);
    roomSocket.on("socket:close", onClose);
    roomSocket.on("chat:new", onChat);
    roomSocket.on("player:sync", onPlayerSync);
    roomSocket.on("player:request_sync", onPlayerSyncRequest);
    roomSocket.on("member:join", onMemberJoin);
    roomSocket.on("member:leave", onMemberLeave);
    roomSocket.on("webrtc:start", onCamStart);
    roomSocket.on("webrtc:stop", onCamStop);
    roomSocket.on("webrtc:offer", onOffer);
    roomSocket.on("webrtc:answer", onAnswer);
    roomSocket.on("webrtc:ice", onIce);
    roomSocket.on("webrtc:restart", onRestart);

    connectSocket();

    return () => {
      active = false;
      roomSocket.off("socket:open", onOpen);
      roomSocket.off("socket:close", onClose);
      roomSocket.off("chat:new", onChat);
      roomSocket.off("player:sync", onPlayerSync);
      roomSocket.off("player:request_sync", onPlayerSyncRequest);
      roomSocket.off("member:join", onMemberJoin);
      roomSocket.off("member:leave", onMemberLeave);
      roomSocket.off("webrtc:start", onCamStart);
      roomSocket.off("webrtc:stop", onCamStop);
      roomSocket.off("webrtc:offer", onOffer);
      roomSocket.off("webrtc:answer", onAnswer);
      roomSocket.off("webrtc:ice", onIce);
      roomSocket.off("webrtc:restart", onRestart);
      roomSocket.disconnect();
      if (videoRetryTimerRef.current) clearTimeout(videoRetryTimerRef.current);
      stopCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleJoinGate = async (values) => {
    setJoinGateLoading(true);
    try {
      const joinResult = await joinRoom(code, {
        password: values.password || null,
      });
      setJoinGateOpen(false);
      joinGateForm.resetFields();

      if (joinResult?.room?.members) {
        setMembers(joinResult.room.members);
        membersRef.current = joinResult.room.members;
      }
      roomSocket.connect(joinResult.ws_token);
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        "Gagal bergabung. Cek kode room atau password.",
      );
      setActionError(msg);
    } finally {
      setJoinGateLoading(false);
    }
  };

  const handleLeave = async () => {
    setActionError("");

    try {
      await leaveRoom(code);
      navigate("/rooms");
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Gagal keluar dari room"));
    }
  };

  const handleClose = async () => {
    setActionError("");

    try {
      await closeRoom(code);
      setRoom((current) =>
        current ? { ...current, status: "ended", is_playing: false } : current,
      );
      setPlayerState((current) => ({ ...current, is_playing: false }));
      roomSocket.disconnect();
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Gagal menutup room"));
    }
  };

  const handleDelete = async () => {
    setActionError("");

    try {
      await deleteRoom(code);
      navigate("/rooms");
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Gagal menghapus room"));
    }
  };

  const handleSendChat = (values) => {
    const message = values.message?.trim();
    if (!message) return;

    const sent = roomSocket.send("chat:send", { message });
    if (!sent) {
      setActionError(
        "Koneksi real-time belum aktif. Klik Refresh atau masuk ulang room.",
      );
      return;
    }

    chatForm.resetFields();
  };

  const hostID = room?.host?.id || room?.host_id;
  const isHostFlag = hostID && currentUser?.id && hostID === currentUser.id;
  const isRoomEnded = room?.status === "ended";

  const sendPlayerEvent = (type) => {
    if (isRoomEnded) return;
    const currentTime = videoRef.current
      ? videoRef.current.currentTime
      : playerState.current_time || 0;
    const isPlaying = type === "player:play";
    const sentAt = Date.now();

    roomSocket.send(type, {
      current_time: currentTime,
      is_playing: isPlaying,
      sent_at: sentAt,
    });
    setPlayerState({
      current_time: currentTime,
      is_playing: isPlaying,
      user_name: currentUser?.name || "Saya",
      sent_at: sentAt,
    });

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  };

  const sendSeekEvent = (value) => {
    if (isRoomEnded) return;
    const nextTime = Number(value) || 0;
    const sentAt = Date.now();
    if (videoRef.current) {
      videoRef.current.currentTime = nextTime;
    }
    roomSocket.send("player:seek", {
      current_time: nextTime,
      is_playing: playerState.is_playing,
      sent_at: sentAt,
    });
    setPlayerState((current) => ({
      ...current,
      current_time: nextTime,
      user_name: currentUser?.name || "Saya",
      sent_at: sentAt,
    }));
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    setPlayerState((current) => ({
      ...current,
      current_time: videoRef.current.currentTime,
    }));
  };

  const handleVideoLoadedMetadata = () => {
    if (!videoRef.current) return;
    videoRetryCountRef.current = 0;
    videoErrorRef.current = false;
    setVideoError("");
    setDriveError(null);

    // Replay last sync data if video wasn't ready when sync arrived
    const sync = lastSyncRef.current;
    if (sync) {
      const targetTime = Number(sync.current_time) || 0;
      videoRef.current.currentTime = targetTime;
      if (sync.is_playing) {
        videoRef.current.play().catch((err) => {
          if (err.name === "NotAllowedError") {
            setupAutoplayUnlock(videoRef.current);
          }
        });
      } else {
        // Ensure video is paused even if browser or prior
        // setupAutoplayUnlock started playback
        videoRef.current.pause();
      }
    } else {
      // No sync received yet — request fresh sync from host
      roomSocket.send("player:request_sync", {});
    }

    setVideoDuration(videoRef.current.duration || 0);
  };

  const handleVolumeChange = (value) => {
    const nextVolume = Math.max(0, Math.min(1, Number(value) || 0));
    setVideoVolume(nextVolume);
    if (videoRef.current) {
      videoRef.current.volume = nextVolume;
    }
  };

  const toggleFullscreen = async () => {
    if (!videoWrapperRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await videoWrapperRef.current.requestFullscreen();
      }
    } catch {
      setActionError("Browser gagal membuka mode fullscreen.");
    }
  };

  // Movie data
  const movie = room?.movie;
  const driveURL = movie?.drive_url || movie?.external_url || "";
  const driveDirectURL = movie?.drive_direct_url || "";
  const videoURL = resolveVideoURL(driveDirectURL);

  const isCacheReady =
    cacheStatus === "ready" ||
    !driveDirectURL ||
    cacheStatus === null ||
    cacheStatus === "checking";
  const isCacheDownloading = cacheStatus === "downloading";
  const videoMode = videoURL && !videoError && isCacheReady ? "native" : null;

  useEffect(() => {
    let active = true;
    let timer = null;

    async function checkDriveCache() {
      if (!videoURL || !driveDirectURL) return;
      await Promise.resolve();
      if (!active) return;
      setCacheStatus((current) => current || "checking");
      try {
        const response = await fetch(`${videoURL}/prefetch`, {
          method: "POST",
        });
        const contentType = response.headers.get("content-type") || "";
        const body = contentType.includes("application/json")
          ? await response.json()
          : null;
        const nextStatus = body?.status || (response.ok ? "ready" : "error");
        if (!active) return;
        if (nextStatus === "ready") {
          // Reset retry state so the video element can reload fresh from cache
          videoRetryCountRef.current = 0;
          videoErrorRef.current = false;
          setCacheStatus("ready");
          setCacheProgress(null);
          setDriveError(null);
          setVideoError("");
          return;
        }
        if (nextStatus === "downloading") {
          setCacheStatus("downloading");
          setCacheProgress(body?.progress || null);
          timer = setTimeout(checkDriveCache, 3000);
          return;
        }
        const normalized = normalizeDriveError(
          body?.error || { code: "drive_proxy_failed" },
        );
        setDriveError(normalized);
        setVideoError(normalized.title);
        setCacheStatus("error");
      } catch {
        if (!active) return;
        setCacheStatus("downloading");
        timer = setTimeout(checkDriveCache, 5000);
      }
    }

    checkDriveCache();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [driveDirectURL, videoURL]);

  // Apply player state changes to video element (backup for when sync fires before video is ready)
  useEffect(() => {
    if (!videoRef.current) return;
    if (playerState.is_playing) {
      videoRef.current.play().catch((err) => {
        if (err.name === "NotAllowedError") {
          setupAutoplayUnlock(videoRef.current);
        }
      });
    } else {
      videoRef.current.pause();
    }
  }, [playerState.is_playing]);

  async function diagnoseVideoURL() {
    if (!videoURL) return;

    try {
      const response = await fetch(videoURL, {
        headers: { Range: "bytes=0-1" },
      });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok && contentType.includes("application/json")) {
        const body = await response.json();
        const normalized = normalizeDriveError(body?.error || body);
        setDriveError(normalized);
        setVideoError(normalized?.title || "Video Google Drive gagal dimuat");
        return;
      }
      if (response.status === 429) {
        const normalized = normalizeDriveError({
          code: "drive_quota_exceeded",
        });
        setDriveError(normalized);
        setVideoError(normalized.title);
        return;
      }
      if (!response.ok) {
        const normalized = normalizeDriveError({ code: "drive_proxy_failed" });
        setDriveError(normalized);
        setVideoError(normalized.title);
      }
    } catch {
      const normalized = normalizeDriveError({ code: "drive_proxy_failed" });
      setDriveError(normalized);
      setVideoError(normalized.title);
    }
  }

  const scheduleVideoRetry = () => {
    const retryCount = videoRetryCountRef.current;
    if (retryCount >= 5) {
      videoErrorRef.current = true;
      diagnoseVideoURL();
      return;
    }

    videoRetryCountRef.current = retryCount + 1;
    setVideoError("");
    setDriveError(null);

    if (videoRetryTimerRef.current) clearTimeout(videoRetryTimerRef.current);
    const delay = 800 + retryCount * 700;
    videoRetryTimerRef.current = setTimeout(() => {
      setVideoRetryKey((current) => current + 1);
    }, delay);
  };

  const onVideoError = () => {
    videoErrorRef.current = false;
    scheduleVideoRetry();
  };

  const handleReloadVideo = () => {
    videoRetryCountRef.current = 0;
    videoErrorRef.current = false;
    setVideoError("");
    setDriveError(null);
    setCacheStatus(driveDirectURL ? "checking" : null);
    setVideoRetryKey((current) => current + 1);
  };

  const handleVideoWrapperMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
      // Remove focus so :focus-within doesn't keep controls visible
      if (videoWrapperRef.current?.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    }, 1500);
  }, []);

  const handleVideoClick = () => {
    if (isHostFlag) {
      sendPlayerEvent(playerState.is_playing ? "player:pause" : "player:play");
    }
    handleVideoWrapperMove();
  };

  // Cleanup idle timer on unmount
  useEffect(() => {
    // Listen for mouse activity on document when in fullscreen
    // (React events may not bubble correctly from fullscreen element)
    const onDocMove = () => {
      if (document.fullscreenElement) {
        handleVideoWrapperMove();
      }
    };
    document.addEventListener("mousemove", onDocMove);
    document.addEventListener("touchstart", onDocMove);
    return () => {
      document.removeEventListener("mousemove", onDocMove);
      document.removeEventListener("touchstart", onDocMove);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [handleVideoWrapperMove]);

  const goToMovieList = () => {
    navigate("/movies");
  };

  return (
    <AppLayout>
      <Space orientation="vertical" size={20} className="full-width">
        {/* Header */}
        <div className="page-heading">
          <div>
            <Link to="/rooms">
              <Button type="text" icon={<ArrowLeftOutlined />}>
                Kembali ke rooms
              </Button>
            </Link>
            <Title level={1}>{room?.name || "Detail Room"}</Title>
            <Space wrap>
              <Text>
                Kode: <Text copyable>{getRoomCode(room)}</Text>
              </Text>
              <Tag color={socketReady ? "green" : "orange"}>
                {socketReady ? "Real-time" : "Offline"}
              </Tag>
              <Tag color={getRoomStatusColor(room?.status)}>
                {getRoomStatusLabel(room?.status)}
              </Tag>
            </Space>
          </div>
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadRoom}
              loading={loading}
            >
              Refresh
            </Button>
            <Button icon={<LogoutOutlined />} onClick={handleLeave}>
              Leave
            </Button>
            {isHostFlag && !isRoomEnded ? (
              <Popconfirm
                title="Tutup room ini?"
                description="Status room menjadi ended dan tidak bisa dijoin lagi. Data room tetap tersimpan."
                okText="Tutup"
                cancelText="Batal"
                okButtonProps={{ danger: true }}
                onConfirm={handleClose}
              >
                <Button danger icon={<CloseCircleOutlined />}>
                  Tutup Room
                </Button>
              </Popconfirm>
            ) : null}
            {isHostFlag ? (
              <Popconfirm
                title="Hapus room ini permanen?"
                description="Room, member, chat, dan riwayat event akan dihapus permanen."
                okText="Hapus"
                cancelText="Batal"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Hapus Room
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        </div>

        {error ? (
          <Alert
            type="warning"
            message={error}
            showIcon
            closable
            onClose={() => setError("")}
          />
        ) : null}
        {actionError ? (
          <Alert
            type="error"
            message={actionError}
            showIcon
            closable
            onClose={() => setActionError("")}
          />
        ) : null}
        {driveError ? (
          <Alert
            type="error"
            message={driveError.title}
            description={
              <Space orientation="vertical" size={8}>
                <Text>{driveError.message}</Text>
                <Text strong>{driveError.suggestion}</Text>
                <Space wrap>
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={handleReloadVideo}
                  >
                    Muat Ulang Video
                  </Button>
                  {driveURL ? (
                    <Button
                      size="small"
                      href={driveURL}
                      target="_blank"
                      icon={<GoogleOutlined />}
                    >
                      Buka di Google Drive
                    </Button>
                  ) : null}
                  <Button size="small" onClick={goToMovieList}>
                    Ganti Link Movie
                  </Button>
                </Space>
              </Space>
            }
            showIcon
            closable
            onClose={() => {
              setDriveError(null);
              setVideoError("");
            }}
          />
        ) : videoError ? (
          <Alert
            type="error"
            message={videoError}
            showIcon
            closable
            onClose={() => setVideoError("")}
          />
        ) : null}
        {isRoomEnded ? (
          <Alert
            type="info"
            message="Room sudah ended. Room ini tidak bisa dijoin lagi, tetapi host masih bisa menghapus room."
            showIcon
          />
        ) : null}

        {/* Main layout: video left, sidebar right */}
        <Row gutter={[20, 20]}>
          {/* Video area */}
          <Col xs={24} lg={16}>
            <Card
              variant="borderless"
              className="dashboard-card video-card"
              loading={loading}
            >
              {videoMode === "native" ? (
                <div
                  ref={videoWrapperRef}
                  className={`video-wrapper${showControls ? " show-controls" : ""}`}
                  onMouseMove={handleVideoWrapperMove}
                  onTouchStart={handleVideoWrapperMove}
                >
                  <video
                    key={videoRetryKey}
                    ref={videoRef}
                    className="room-video"
                    autoPlay={!!playerState.is_playing}
                    onError={onVideoError}
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onClick={handleVideoClick}
                    onMouseMove={handleVideoWrapperMove}
                    onTouchStart={handleVideoWrapperMove}
                    playsInline
                  >
                    <source src={videoURL} />
                  </video>
                  <div className="video-controls">
                    {isHostFlag ? (
                      <Button
                        aria-label={playerState.is_playing ? "Pause" : "Play"}
                        className="video-icon-button"
                        icon={
                          playerState.is_playing ? (
                            <PauseCircleOutlined />
                          ) : (
                            <PlayCircleOutlined />
                          )
                        }
                        type="primary"
                        shape="circle"
                        disabled={isRoomEnded}
                        onClick={() =>
                          sendPlayerEvent(
                            playerState.is_playing
                              ? "player:pause"
                              : "player:play",
                          )
                        }
                      />
                    ) : null}
                    <Text className="video-time">
                      {formatSeconds(playerState.current_time)}
                    </Text>
                    {isHostFlag ? (
                      <Slider
                        className="video-seek-slider"
                        min={0}
                        max={Math.max(
                          videoDuration,
                          playerState.current_time,
                          1,
                        )}
                        step={0.25}
                        tooltip={{ formatter: formatSeconds }}
                        disabled={isRoomEnded}
                        value={Math.min(
                          playerState.current_time,
                          Math.max(videoDuration, playerState.current_time, 1),
                        )}
                        onChange={(value) =>
                          setPlayerState((current) => ({
                            ...current,
                            current_time: Number(value) || 0,
                          }))
                        }
                        onChangeComplete={sendSeekEvent}
                      />
                    ) : (
                      <div
                        className="video-progress-readonly"
                        aria-label="Progress video"
                      >
                        <div
                          className="video-progress-readonly-fill"
                          style={{
                            width: `${Math.min(100, (playerState.current_time / Math.max(videoDuration, 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                    <Text className="video-time">
                      {formatSeconds(videoDuration)}
                    </Text>
                    <div className="video-volume-control">
                      <Button
                        aria-label="Volume"
                        className="video-icon-button"
                        icon={<SoundOutlined />}
                        shape="circle"
                        ghost
                      />
                      <div className="video-volume-popover">
                        <Slider
                          className="video-volume-slider"
                          vertical
                          min={0}
                          max={1}
                          step={0.05}
                          tooltip={{
                            formatter: (value) =>
                              `${Math.round((value || 0) * 100)}%`,
                          }}
                          value={videoVolume}
                          onChange={handleVolumeChange}
                        />
                      </div>
                    </div>
                    <Button
                      aria-label={isFullscreen ? "Minimize" : "Maximize"}
                      className="video-icon-button"
                      icon={
                        isFullscreen ? <CompressOutlined /> : <ExpandOutlined />
                      }
                      shape="circle"
                      ghost
                      onClick={toggleFullscreen}
                    />
                  </div>
                  {playerState.user_name ? (
                    <div className="video-status">
                      <Text type="secondary">
                        {playerState.is_playing ? "Playing" : "Paused"} —{" "}
                        {playerState.user_name}
                      </Text>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="room-player-placeholder">
                  {isCacheDownloading ? (
                    <Spin size="large" />
                  ) : (
                    <GoogleOutlined />
                  )}
                  <Title level={3}>
                    {isCacheDownloading
                      ? "Mendownload film ke server..."
                      : "Google Drive Video"}
                  </Title>
                  <Paragraph>
                    {isCacheDownloading
                      ? cacheProgress?.downloaded
                        ? `Download berjalan: ${formatBytes(cacheProgress.downloaded)}${cacheProgress.total ? ` / ${formatBytes(cacheProgress.total)} (${Math.round((cacheProgress.downloaded / cacheProgress.total) * 100)}%)` : ""}`
                        : "Server sedang mulai download film dari Google Drive. Progress akan muncul sebentar lagi."
                      : "Pilih movie Google Drive agar video tampil."}
                  </Paragraph>
                  <Space wrap>
                    {driveURL ? (
                      <Button
                        type="primary"
                        onClick={handleReloadVideo}
                        icon={<ReloadOutlined />}
                        disabled={isCacheDownloading}
                      >
                        Muat Ulang Video
                      </Button>
                    ) : null}
                    {driveURL ? (
                      <Button
                        href={driveURL}
                        target="_blank"
                        icon={<GoogleOutlined />}
                      >
                        Buka di Google Drive
                      </Button>
                    ) : null}
                    {driveURL ? (
                      <Button onClick={goToMovieList}>Ganti Link Movie</Button>
                    ) : null}
                  </Space>
                  {driveURL ? (
                    <Text copyable style={{ marginTop: 8, display: "block" }}>
                      {driveURL}
                    </Text>
                  ) : null}
                </div>
              )}
            </Card>

            <Row gutter={[16, 16]} className="room-bottom-info">
              <Col xs={24} md={12}>
                <Card
                  variant="borderless"
                  className="dashboard-card"
                  title="Info Room"
                  size="small"
                >
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Mode">
                      <Tag>{room?.mode || "-"}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Private">
                      {room?.is_private ? "Ya" : "Tidak"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Max">
                      {room?.max_members || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Waktu">
                      {formatSeconds(playerState.current_time)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Dibuat">
                      {formatDateTime(room?.created_at)}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card
                  variant="borderless"
                  className="dashboard-card"
                  title={`Peserta (${members.length})`}
                  size="small"
                >
                  <div className="member-list">
                    {members.length === 0 ? (
                      <Text type="secondary">Belum ada peserta.</Text>
                    ) : null}
                    {members.map((member) => (
                      <div key={member.id} className="member-row">
                        <Avatar size="small">
                          {member.name?.[0]?.toUpperCase() || "?"}
                        </Avatar>
                        <div className="member-info">
                          <Text strong>{member.name || "User"}</Text>
                          <Tag
                            color={member.role === "host" ? "green" : "blue"}
                          >
                            {member.role === "host" ? "host" : "member"}
                          </Tag>
                          <Tag
                            color={
                              onlineMembers.has(member.id) ? "green" : "default"
                            }
                          >
                            {onlineMembers.has(member.id)
                              ? "online"
                              : "offline"}
                          </Tag>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>

          <Col xs={24} lg={8}>
            <div className="room-sidebar">
              <Card
                variant="borderless"
                className="dashboard-card participant-card"
                title={`Video Call ${camActive ? "(Kamera ON)" : ""}`}
                size="small"
              >
                <Space orientation="vertical" className="full-width">
                  {!camActive ? (
                    !showDevicePicker ? (
                      <Button
                        type="primary"
                        icon={<VideoCameraAddOutlined />}
                        onClick={handleStartCamClick}
                        block
                      >
                        Nyalakan Kamera
                      </Button>
                    ) : (
                      <div className="device-picker">
                        <Text strong>Pilih Perangkat</Text>
                        <Space
                          direction="vertical"
                          className="full-width"
                          size={4}
                        >
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Kamera
                            </Text>
                            <Select
                              className="full-width"
                              size="small"
                              value={selectedVideoDevice}
                              onChange={setSelectedVideoDevice}
                              options={
                                availableDevices.video.length > 0
                                  ? availableDevices.video.map((d) => ({
                                      label:
                                        d.label ||
                                        `Kamera ${d.deviceId.slice(0, 8)}`,
                                      value: d.deviceId,
                                    }))
                                  : [{ label: "Kamera default", value: "" }]
                              }
                            />
                          </div>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Mikrofon
                            </Text>
                            <Select
                              className="full-width"
                              size="small"
                              value={selectedAudioDevice}
                              onChange={setSelectedAudioDevice}
                              options={
                                availableDevices.audio.length > 0
                                  ? availableDevices.audio.map((d) => ({
                                      label:
                                        d.label ||
                                        `Mikrofon ${d.deviceId.slice(0, 8)}`,
                                      value: d.deviceId,
                                    }))
                                  : [{ label: "Mikrofon default", value: "" }]
                              }
                            />
                          </div>
                          <Space>
                            <Button
                              type="primary"
                              size="small"
                              icon={<VideoCameraAddOutlined />}
                              onClick={handleConfirmCam}
                            >
                              Nyalakan
                            </Button>
                            <Button
                              size="small"
                              onClick={() => setShowDevicePicker(false)}
                            >
                              Batal
                            </Button>
                          </Space>
                        </Space>
                      </div>
                    )
                  ) : (
                    <Space wrap>
                      <Button
                        danger
                        size="small"
                        icon={<PhoneOutlined />}
                        onClick={stopMyCam}
                      >
                        Matikan Kamera
                      </Button>
                      <Button
                        size="small"
                        icon={
                          micMuted ? <AudioMutedOutlined /> : <AudioOutlined />
                        }
                        onClick={toggleMic}
                        type={micMuted ? "default" : "primary"}
                      >
                        {micMuted ? "Unmute" : "Mute"}
                      </Button>
                    </Space>
                  )}

                  <div className="participant-grid">
                    <ParticipantTile
                      name={currentUser?.name || "Saya"}
                      isMe
                      camActive={camActive}
                      videoRef={localVideoRef}
                    />
                    {members
                      .filter(
                        (m) =>
                          m.id !== currentUser?.id && onlineMembers.has(m.id),
                      )
                      .map((member) => {
                        const isCamOn = activeCams.has(member.id);
                        const hasStream = remoteStreams.find(
                          (s) => s.userID === member.id,
                        );
                        return (
                          <ParticipantTile
                            key={member.id}
                            name={member.name || "User"}
                            role={member.role}
                            isCamOn={isCamOn}
                            stream={hasStream?.stream}
                          />
                        );
                      })}
                  </div>
                </Space>
              </Card>

              <Card
                variant="borderless"
                className="dashboard-card"
                title="Chat"
                size="small"
              >
                <div className="room-chat-scroll">
                  {chats.length === 0 ? (
                    <Text type="secondary">Belum ada chat</Text>
                  ) : null}
                  {chats.map((chat) => {
                    const chatUserID = chat.user?.id || chat.user_id;
                    const isMine =
                      chatUserID &&
                      currentUser?.id &&
                      chatUserID === currentUser.id;
                    return (
                      <div
                        key={chat.id || `${chatUserID}-${chat.created_at}`}
                        className={`chat-bubble-row ${isMine ? "mine" : "other"}`}
                      >
                        <div className="chat-bubble">
                          <Text strong className="chat-user">
                            {chat.user?.name || chat.user_id || "User"}
                          </Text>
                          <Paragraph className="chat-message">
                            {chat.message}
                          </Paragraph>
                          <Text type="secondary" className="chat-time">
                            {formatDateTime(chat.created_at)}
                          </Text>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatsEndRef} />
                </div>
                <Form
                  form={chatForm}
                  onFinish={handleSendChat}
                  className="chat-form"
                >
                  <Space.Compact className="full-width">
                    <Form.Item name="message" noStyle>
                      <Input placeholder="Tulis chat..." />
                    </Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SendOutlined />}
                    >
                      Kirim
                    </Button>
                  </Space.Compact>
                </Form>
              </Card>
            </div>
          </Col>
        </Row>
      </Space>

      <Modal
        title="Gabung ke Room"
        open={joinGateOpen}
        centered
        closable={false}
        maskClosable={false}
        footer={null}
        destroyOnClose
      >
        <Form form={joinGateForm} layout="vertical" onFinish={handleJoinGate} requiredMark={false}>
          <Form.Item label="Kode Room">
            <Input value={code} disabled />
          </Form.Item>
          <Form.Item label="Password" name="password">
            <Input.Password placeholder="Isi jika room private" />
          </Form.Item>
          <Space direction="vertical" className="full-width">
            <Button type="primary" htmlType="submit" loading={joinGateLoading} block>
              Gabung
            </Button>
            <Button
              block
              onClick={() => {
                setJoinGateOpen(false);
                navigate('/rooms');
              }}
            >
              Batal
            </Button>
          </Space>
        </Form>
      </Modal>
    </AppLayout>
  );
}

function ParticipantTile({
  name,
  role,
  isMe = false,
  camActive = false,
  isCamOn = false,
  stream,
  videoRef,
}) {
  const remoteRef = useRef(null);

  useEffect(() => {
    if (remoteRef.current && stream) {
      remoteRef.current.srcObject = stream;
      remoteRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    const el = remoteRef.current;
    if (!el || !stream) return;
    const onPlaying = () => {
      el.style.visibility = "visible";
    };
    const onStalled = () => {
      el.play().catch(() => {});
    };
    el.addEventListener("playing", onPlaying);
    el.addEventListener("stalled", onStalled);
    el.addEventListener("suspend", onStalled);
    return () => {
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("stalled", onStalled);
      el.removeEventListener("suspend", onStalled);
    };
  }, [stream]);

  const streamKey = stream?.id || "no-stream";

  if (isMe && camActive) {
    return (
      <div className="participant-tile">
        <video
          ref={videoRef}
          className="participant-video"
          autoPlay
          muted
          playsInline
        />
        <Text className="participant-name-overlay">{name} (Anda)</Text>
      </div>
    );
  }

  if (stream) {
    return (
      <div className="participant-tile">
        <video
          ref={remoteRef}
          className="participant-video"
          key={streamKey}
          autoPlay
          playsInline
        />
        <Text className="participant-name-overlay">{name}</Text>
      </div>
    );
  }

  return (
    <div className="participant-tile">
      <div className={`participant-placeholder ${isCamOn ? "connecting" : ""}`}>
        <Avatar size={48} className="participant-avatar">
          {name?.[0]?.toUpperCase() || "?"}
        </Avatar>
        <Text className="participant-name">
          {name || "User"}
          {isMe ? " (Anda)" : ""}
        </Text>
        {isCamOn ? (
          <Text className="participant-label">Menghubungkan...</Text>
        ) : (
          <Badge
            color={role === "host" ? "green" : "blue"}
            text={role === "host" ? "Host" : "Member"}
          />
        )}
      </div>
    </div>
  );
}
