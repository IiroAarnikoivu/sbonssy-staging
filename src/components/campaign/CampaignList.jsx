import CampaignCard from "./CampaignCard";

/**
 * Component to render a grid of campaign cards.
 * @param {Object} props
 * @param {Array} props.items - Array of campaign or invitation items
 * @param {string} props.type - Type of items ('campaign', 'joined', 'invitation', or 'favorite')
 * @param {Object} [props.requestStatuses] - Statuses of campaign interactions
 * @param {Function} [props.handleApplyClick] - Handler for applying to a campaign
 * @param {Function} [props.handleJoinClick] - Handler for joining a campaign
 * @param {Function} [props.handleCancelClick] - Handler for canceling a request
 * @param {Function} [props.handleInvitationAction] - Handler for accepting/declining invitations
 * @param {Array} [props.favoriteCampaigns] - Array of favorite campaigns
 * @param {Function} [props.handleFavoriteClick] - Handler for adding/removing favorites
 * @returns {JSX.Element} The CampaignList component
 */
const CampaignList = ({
  items,
  type,
  requestStatuses,
  handleApplyClick,
  handleJoinClick,
  handleCancelClick,
  handleInvitationAction,
  favoriteCampaigns,
  // handleFavoriteClick,
  handleShare,
  isShare,
  shareUrls,
  pendingRequestIds,
  handleFavourites,
  handleFavoriteClick,
  favourites,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {items.map((item, index) => (
      <CampaignCard
        key={index}
        item={item}
        type={type}
        requestStatuses={requestStatuses}
        handleApplyClick={handleApplyClick}
        handleJoinClick={handleJoinClick}
        handleCancelClick={handleCancelClick}
        handleInvitationAction={handleInvitationAction}
        isCampaignFavorite={favoriteCampaigns?.some(
          (fav) => fav._id === item._id
        )}
        handleFavoriteClick={handleFavoriteClick}
        handleShare={handleShare}
        isShare={isShare}
        shareUrls={shareUrls}
        handleFavourites={handleFavourites}
        favourites={favourites}
        pendingRequestIds={pendingRequestIds}
        // handleFavoriteClick={handleFavoriteClick}
      />
    ))}
  </div>
);

export default CampaignList;
