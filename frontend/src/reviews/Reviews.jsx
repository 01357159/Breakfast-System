import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import ReviewBoard from './ReviewBoard';

export default function Reviews() {
  const [params] = useSearchParams();
  const auth = useAuth();
  return <main className="customer-reviews">
    <nav className="review-navigation"><Link to={`/customer/menu?${params.toString()}`}>← 返回點餐</Link><span>北寧路早餐店</span></nav>
    <ReviewBoard key={auth.user?.id || 'guest'} />
  </main>;
}
