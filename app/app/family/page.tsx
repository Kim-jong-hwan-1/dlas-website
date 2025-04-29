'use client';

import { useEffect, useState, useRef } from 'react';
import axiosInstance from '@/utils/axiosInstance';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useNotification } from '@/hooks/useNotification';
import { useUser } from '@/hooks/useUser';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });  // 15번째 줄 수정

type Post = {
  id: number;
  title: string;
  content: string;
  author_id: number;
  created_at: string;
  category_id: number;
};

const CATEGORY_LIST = [
  { id: 0, name: '전체' },
  { id: 1, name: '버그수정요청' },
  { id: 2, name: '아이디어제안' },
  { id: 3, name: '사용팁' },
  { id: 4, name: '기타' },
];

export default function FamilyPage() {
  const { user } = useUser();
  const notifications = useNotification();
  const quillRef = useRef<any>(null);  // 39번째 줄 수정

  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<{ [key: number]: any[] }>({});
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
  const [tab, setTab] = useState<number>(0);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState(1);

  const postsPerPage = 20;

  useEffect(() => {
    fetchPosts();
  }, [tab, searchText, page]);

  const fetchPosts = async () => {
    try {
      const { data } = await axiosInstance.get('/posts', {
        params: {
          keyword: searchText,
          category_id: tab === 0 ? undefined : tab,
          skip: (page - 1) * postsPerPage,
          limit: postsPerPage,
        },
      });
      setPosts(data);
    } catch (err) {
      console.error('게시글 불러오기 실패:', err);
    }
  };

  const handleSubmitPost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert('제목과 내용을 입력하세요.');
      return;
    }
    try {
      await axiosInstance.post('/posts', {
        title: newTitle,
        content: newContent,
        category_id: newCategory,
      });
      alert('게시글이 등록되었습니다.');
      setNewTitle('');
      setNewContent('');
      setNewCategory(1);
      setShowModal(false);
      fetchPosts();
    } catch (err) {
      console.error('글 작성 실패:', err);
      alert('글 작성 실패');
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      const { data } = await axiosInstance.get(`/comments/${postId}`);
      setComments(prev => ({ ...prev, [postId]: data }));
    } catch (err) {
      console.error('댓글 불러오기 실패:', err);
    }
  };

  const handleSubmitComment = async (postId: number) => {
    const content = newComment[postId];
    if (!content?.trim()) {
      alert('댓글을 입력하세요.');
      return;
    }
    try {
      await axiosInstance.post('/comments', { post_id: postId, content });
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      fetchComments(postId);
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 작성 실패');
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await axiosInstance.delete(`/posts/${postId}`);
      alert('삭제되었습니다');
      fetchPosts();
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제 실패');
    }
  };

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await axiosInstance.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data.url;
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const range = editor.getSelection();
        editor.insertEmbed(range?.index ?? 0, 'image', url);
      }
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) await handleImageUpload(file);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-black relative" onPaste={handlePaste}>
      <nav className="fixed top-0 left-0 w-full bg-white py-4 px-8 shadow-lg z-40">
        <div className="flex justify-center items-center relative">
          <Image src="/logo.png" alt="DLAS Logo" width={600} height={400} className="object-contain" />
          <div className="absolute bottom-2 right-8 flex items-center space-x-8">
            <Link href="/?tab=home" className="text-gray-700 hover:text-black">Home</Link>
            <Link href="/?tab=download" className="text-gray-700 hover:text-black">Download</Link>
            <Link href="/?tab=buy" className="text-gray-700 hover:text-black">Buy</Link>
            <Link href="/?tab=contact" className="text-gray-700 hover:text-black">Contact</Link>
            <span className="border-b-2 border-blue-600 text-blue-700 font-bold bg-blue-50 px-4 py-1 rounded">
              Family
            </span>
          </div>
        </div>
      </nav>

      <main className="pt-[220px] px-6 max-w-5xl mx-auto">
        <div className="text-right mb-4">
          <button
            onClick={() => setShowModal(true)}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            ✍ 글 작성하기
          </button>
        </div>

        <div className="space-y-6 mb-12">
          {posts.map(post => (
            <div key={post.id} className="bg-gray-50 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-bold">{post.title}</h3>
              <div
                className="text-gray-700 text-sm mb-2"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
              <div className="flex items-center mt-2">
                <button
                  onClick={() => fetchComments(post.id)}
                  className="text-blue-500 text-sm"
                >
                  댓글 보기
                </button>
                {user?.isAdmin && (
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="ml-4 text-red-500 text-sm"
                  >
                    삭제
                  </button>
                )}
              </div>
              <div className="mt-4">
                {comments[post.id]?.map(c => (
                  <div key={c.id} className="border-t py-2 text-sm">{c.content}</div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="댓글 작성..."
                  value={newComment[post.id] || ''}
                  onChange={e => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                  className="border px-2 py-1 rounded w-full"
                />
                <button
                  onClick={() => handleSubmitComment(post.id)}
                  className="bg-black text-white px-3 py-1 rounded"
                >
                  등록
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-[90%] max-w-3xl">
            <h2 className="text-xl font-bold mb-4">글 작성하기</h2>
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full border px-3 py-2 mb-3 rounded"
            />
            <ReactQuill
              ref={quillRef}
              value={newContent}
              onChange={setNewContent}
              modules={{
                toolbar: {
                  container: [
                    ['bold','italic','underline','strike'],
                    ['blockquote','code-block'],
                    [{ header: 1 }, { header: 2 }],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link','image'], ['clean']
                  ],
                  handlers: {
                    image: () => {
                      const input = document.createElement('input');
                      input.setAttribute('type', 'file');
                      input.setAttribute('accept', 'image/*');
                      input.click();
                      input.onchange = async () => {
                        const file = input.files?.[0];
                        if (file) await handleImageUpload(file);
                      };
                    }
                  }
                }
              }}
              theme="snow"
              className="mb-4 bg-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded"
              >
                취소
              </button>
              <button
                onClick={handleSubmitPost}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {notifications.map((note, idx) => (
        <div
          key={idx}
          className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded mb-2 shadow-lg z-50"
        >
          {note}
        </div>
      ))}
    </div>
  );
}
